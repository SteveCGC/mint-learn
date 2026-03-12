import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

describe('CourseManager', function () {
  const PRICE = 100n * 10n ** 18n;
  const UPDATED_PRICE = 150n * 10n ** 18n;
  const SECOND_PRICE = 75n * 10n ** 18n;
  const BUYER_FUNDS = 1_000n * 10n ** 18n;
  const META_HASH = ethers.keccak256(ethers.toUtf8Bytes('course-meta-1'));
  const UPDATED_META_HASH = ethers.keccak256(ethers.toUtf8Bytes('course-meta-1-updated'));
  const SECOND_META_HASH = ethers.keccak256(ethers.toUtf8Bytes('course-meta-2'));

  async function deployCourseManagerFixture() {
    const [owner, author, buyer, other] = await ethers.getSigners();

    const MTToken = await ethers.getContractFactory('MTToken');
    const token = await MTToken.deploy(owner.address);

    const CourseManager = await ethers.getContractFactory('CourseManager');
    const courseManager = await CourseManager.deploy(await token.getAddress(), owner.address);

    await token.transfer(buyer.address, BUYER_FUNDS);
    await token.transfer(other.address, BUYER_FUNDS);

    return { courseManager, token, owner, author, buyer, other };
  }

  async function deployCourseFixture() {
    const fixture = await deployCourseManagerFixture();

    await fixture.courseManager.connect(fixture.author).createCourse(PRICE, META_HASH);

    return fixture;
  }

  async function deployTwoCoursesFixture() {
    const fixture = await deployCourseManagerFixture();

    await fixture.courseManager.connect(fixture.author).createCourse(PRICE, META_HASH);
    await fixture.courseManager.connect(fixture.author).createCourse(SECOND_PRICE, SECOND_META_HASH);

    return fixture;
  }

  async function deployReentrancyFixture() {
    const [owner, author, buyer] = await ethers.getSigners();

    const ReentrantToken = await ethers.getContractFactory('ReentrantToken');
    const token = await ReentrantToken.deploy();

    const CourseManager = await ethers.getContractFactory('CourseManager');
    const courseManager = await CourseManager.deploy(await token.getAddress(), owner.address);

    await courseManager.connect(author).createCourse(PRICE, META_HASH);
    await courseManager.connect(author).createCourse(SECOND_PRICE, SECOND_META_HASH);

    await token.mint(buyer.address, BUYER_FUNDS);
    await token.connect(buyer).approve(await courseManager.getAddress(), BUYER_FUNDS);
    await token.setReentry(await courseManager.getAddress(), 2n);

    return { courseManager, token, owner, author, buyer };
  }

  describe('createCourse', function () {
    it('reverts with InvalidPrice when price is 0', async function () {
      const { courseManager, author } = await loadFixture(deployCourseManagerFixture);

      await expect(courseManager.connect(author).createCourse(0n, META_HASH))
        .to.be.revertedWithCustomError(courseManager, 'InvalidPrice');
    });

    it('creates a course, increments courseCount, and emits CourseCreated', async function () {
      const { courseManager, author } = await loadFixture(deployCourseManagerFixture);
      expect(await courseManager.courseCount()).to.equal(0n);

      await expect(courseManager.connect(author).createCourse(PRICE, META_HASH))
        .to.emit(courseManager, 'CourseCreated')
        .withArgs(1n, author.address, PRICE, META_HASH);

      expect(await courseManager.courseCount()).to.equal(1n);

      const course = await courseManager.courses(1n);
      expect(course.id).to.equal(1n);
      expect(course.author).to.equal(author.address);
      expect(course.price).to.equal(PRICE);
      expect(course.metaHash).to.equal(META_HASH);
      expect(course.isActive).to.equal(true);
      expect(course.createdAt).to.be.greaterThan(0n);
    });

    it('returns the correct array from getAuthorCourses', async function () {
      const { courseManager, author } = await loadFixture(deployCourseManagerFixture);

      await courseManager.connect(author).createCourse(PRICE, META_HASH);
      await courseManager.connect(author).createCourse(SECOND_PRICE, SECOND_META_HASH);

      expect(await courseManager.getAuthorCourses(author.address)).to.deep.equal([1n, 2n]);
    });
  });

  describe('updateCourse', function () {
    it('reverts with NotCourseAuthor when called by a non-author', async function () {
      const { courseManager, other } = await loadFixture(deployCourseFixture);

      await expect(courseManager.connect(other).updateCourse(1n, UPDATED_PRICE, UPDATED_META_HASH))
        .to.be.revertedWithCustomError(courseManager, 'NotCourseAuthor');
    });

    it('allows the author to update the course and emits CourseUpdated', async function () {
      const { courseManager, author } = await loadFixture(deployCourseFixture);

      await expect(courseManager.connect(author).updateCourse(1n, UPDATED_PRICE, UPDATED_META_HASH))
        .to.emit(courseManager, 'CourseUpdated')
        .withArgs(1n, UPDATED_PRICE, UPDATED_META_HASH);

      const course = await courseManager.courses(1n);
      expect(course.price).to.equal(UPDATED_PRICE);
      expect(course.metaHash).to.equal(UPDATED_META_HASH);
    });
  });

  describe('deactivateCourse', function () {
    it('reverts for a non-author and deactivates successfully for the author', async function () {
      const { courseManager, author, other } = await loadFixture(deployCourseFixture);

      await expect(courseManager.connect(other).deactivateCourse(1n))
        .to.be.revertedWithCustomError(courseManager, 'NotCourseAuthor');

      await expect(courseManager.connect(author).deactivateCourse(1n))
        .to.emit(courseManager, 'CourseDeactivated')
        .withArgs(1n);

      const course = await courseManager.courses(1n);
      expect(course.isActive).to.equal(false);
    });
  });

  describe('purchaseCourse', function () {
    it('reverts when the buyer has not approved MT for transfer', async function () {
      const { courseManager, token, buyer, author } = await loadFixture(deployCourseFixture);

      await expect(courseManager.connect(buyer).purchaseCourse(1n))
        .to.be.revertedWithCustomError(token, 'ERC20InsufficientAllowance')
        .withArgs(await courseManager.getAddress(), 0n, PRICE);

      expect(await token.balanceOf(buyer.address)).to.equal(BUYER_FUNDS);
      expect(await token.balanceOf(author.address)).to.equal(0n);
      expect(await courseManager.checkPurchase(buyer.address, 1n)).to.equal(false);
    });

    it('purchases successfully, transfers MT to the author, and emits CoursePurchased', async function () {
      const { courseManager, token, buyer, author } = await loadFixture(deployCourseFixture);

      await token.connect(buyer).approve(await courseManager.getAddress(), PRICE);

      await expect(courseManager.connect(buyer).purchaseCourse(1n))
        .to.emit(courseManager, 'CoursePurchased')
        .withArgs(1n, buyer.address, PRICE);

      expect(await token.balanceOf(buyer.address)).to.equal(BUYER_FUNDS - PRICE);
      expect(await token.balanceOf(author.address)).to.equal(PRICE);
      expect(await courseManager.checkPurchase(buyer.address, 1n)).to.equal(true);
    });

    it('reverts with AlreadyPurchased when buying the same course twice', async function () {
      const { courseManager, token, buyer } = await loadFixture(deployCourseFixture);

      await token.connect(buyer).approve(await courseManager.getAddress(), PRICE * 2n);
      await courseManager.connect(buyer).purchaseCourse(1n);

      await expect(courseManager.connect(buyer).purchaseCourse(1n))
        .to.be.revertedWithCustomError(courseManager, 'AlreadyPurchased');
    });

    it('reverts with CourseNotActive when the course has been deactivated', async function () {
      const { courseManager, token, buyer, author } = await loadFixture(deployCourseFixture);

      await courseManager.connect(author).deactivateCourse(1n);
      await token.connect(buyer).approve(await courseManager.getAddress(), PRICE);

      await expect(courseManager.connect(buyer).purchaseCourse(1n))
        .to.be.revertedWithCustomError(courseManager, 'CourseNotActive');
    });

    it('blocks a reentrancy attack with ReentrancyGuard', async function () {
      const { courseManager, buyer } = await loadFixture(deployReentrancyFixture);

      await expect(courseManager.connect(buyer).purchaseCourse(1n))
        .to.be.revertedWithCustomError(courseManager, 'ReentrancyGuardReentrantCall');

      expect(await courseManager.checkPurchase(buyer.address, 1n)).to.equal(false);
      expect(await courseManager.checkPurchase(buyer.address, 2n)).to.equal(false);
      expect(await courseManager.getUserPurchases(buyer.address)).to.deep.equal([]);
    });
  });

  describe('view functions', function () {
    it('returns correct results for checkPurchase, getUserPurchases, and getAuthorCourses', async function () {
      const { courseManager, token, author, buyer, other } = await loadFixture(deployTwoCoursesFixture);

      await token.connect(buyer).approve(await courseManager.getAddress(), PRICE);
      await courseManager.connect(buyer).purchaseCourse(1n);

      expect(await courseManager.checkPurchase(buyer.address, 1n)).to.equal(true);
      expect(await courseManager.checkPurchase(buyer.address, 2n)).to.equal(false);
      expect(await courseManager.checkPurchase(other.address, 1n)).to.equal(false);
      expect(await courseManager.getUserPurchases(buyer.address)).to.deep.equal([1n]);
      expect(await courseManager.getUserPurchases(other.address)).to.deep.equal([]);
      expect(await courseManager.getAuthorCourses(author.address)).to.deep.equal([1n, 2n]);
    });
  });
});
