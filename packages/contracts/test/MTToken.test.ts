import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

const INITIAL_SUPPLY = 1_000_000_000n * 10n ** 18n;

describe('MTToken', function () {
  async function deployMTTokenFixture() {
    const [owner, addr1, addr2, spender] = await ethers.getSigners();
    const MTToken = await ethers.getContractFactory('MTToken');
    const token = await MTToken.deploy(owner.address);

    return { token, owner, addr1, addr2, spender };
  }

  it('assigns the full initial supply to the owner on deployment', async function () {
    const { token, owner } = await loadFixture(deployMTTokenFixture);

    expect(await token.owner()).to.equal(owner.address);
    expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
    expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
  });

  it('allows the owner to mint tokens to any address', async function () {
    const { token, addr1 } = await loadFixture(deployMTTokenFixture);
    const mintAmount = 250n * 10n ** 18n;

    await expect(token.mint(addr1.address, mintAmount))
      .to.emit(token, 'Transfer')
      .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);

    expect(await token.balanceOf(addr1.address)).to.equal(mintAmount);
    expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
  });

  it('reverts when a non-owner tries to mint', async function () {
    const { token, addr1, addr2 } = await loadFixture(deployMTTokenFixture);

    await expect(token.connect(addr1).mint(addr2.address, 1n))
      .to.be.revertedWithCustomError(token, 'OwnableUnauthorizedAccount')
      .withArgs(addr1.address);
  });

  it('allows holders to burn their own tokens', async function () {
    const { token, owner, addr1 } = await loadFixture(deployMTTokenFixture);
    const transferAmount = 500n * 10n ** 18n;
    const burnAmount = 120n * 10n ** 18n;

    await token.transfer(addr1.address, transferAmount);

    await expect(token.connect(addr1).burn(burnAmount))
      .to.emit(token, 'Transfer')
      .withArgs(addr1.address, ethers.ZeroAddress, burnAmount);

    expect(await token.balanceOf(addr1.address)).to.equal(transferAmount - burnAmount);
    expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
    expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - transferAmount);
  });

  it('reverts when burn amount exceeds the holder balance', async function () {
    const { token, addr1 } = await loadFixture(deployMTTokenFixture);

    await expect(token.connect(addr1).burn(1n))
      .to.be.revertedWithCustomError(token, 'ERC20InsufficientBalance')
      .withArgs(addr1.address, 0n, 1n);
  });

  it('supports approve, allowance, transfer, and transferFrom correctly', async function () {
    const { token, owner, addr1, addr2, spender } = await loadFixture(deployMTTokenFixture);
    const transferAmount = 400n * 10n ** 18n;
    const approveAmount = 150n * 10n ** 18n;
    const transferFromAmount = 90n * 10n ** 18n;

    await expect(token.transfer(addr1.address, transferAmount))
      .to.emit(token, 'Transfer')
      .withArgs(owner.address, addr1.address, transferAmount);

    expect(await token.balanceOf(addr1.address)).to.equal(transferAmount);

    await expect(token.connect(addr1).approve(spender.address, approveAmount))
      .to.emit(token, 'Approval')
      .withArgs(addr1.address, spender.address, approveAmount);

    expect(await token.allowance(addr1.address, spender.address)).to.equal(approveAmount);

    await expect(
      token.connect(spender).transferFrom(addr1.address, addr2.address, transferFromAmount)
    )
      .to.emit(token, 'Transfer')
      .withArgs(addr1.address, addr2.address, transferFromAmount);

    expect(await token.balanceOf(addr1.address)).to.equal(transferAmount - transferFromAmount);
    expect(await token.balanceOf(addr2.address)).to.equal(transferFromAmount);
    expect(await token.allowance(addr1.address, spender.address)).to.equal(
      approveAmount - transferFromAmount
    );
  });

  it('reverts when transferring to the zero address', async function () {
    const { token, owner } = await loadFixture(deployMTTokenFixture);

    await expect(token.transfer(ethers.ZeroAddress, 1n))
      .to.be.revertedWithCustomError(token, 'ERC20InvalidReceiver')
      .withArgs(ethers.ZeroAddress);

    await expect(token.approve(owner.address, 1n)).to.not.be.reverted;
    await expect(token.transferFrom(owner.address, ethers.ZeroAddress, 1n))
      .to.be.revertedWithCustomError(token, 'ERC20InvalidReceiver')
      .withArgs(ethers.ZeroAddress);
  });
});
