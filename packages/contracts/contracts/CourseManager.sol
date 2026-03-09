// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CourseManager
 * @dev 课程管理合约：课程上链、MT 代币购买、购买状态记录
 */
contract CourseManager is ReentrancyGuard, Ownable {
    IERC20 public immutable mtToken;

    struct Course {
        uint256 id;
        address author;
        uint256 price;      // MT 最小单位
        bytes32 metaHash;   // 课程元数据 hash（IPFS CID 或链下 DB ID hash）
        bool isActive;
        uint256 createdAt;
    }

    uint256 public courseCount;

    mapping(uint256 => Course) public courses;
    mapping(address => mapping(uint256 => bool)) public hasPurchased;
    mapping(address => uint256[]) private _authorCourses;
    mapping(address => uint256[]) private _userPurchases;

    // ─── Events ────────────────────────────────────────────
    event CourseCreated(uint256 indexed courseId, address indexed author, uint256 price, bytes32 metaHash);
    event CoursePurchased(uint256 indexed courseId, address indexed buyer, uint256 price);
    event CourseUpdated(uint256 indexed courseId, uint256 newPrice, bytes32 newMetaHash);
    event CourseDeactivated(uint256 indexed courseId);

    // ─── Errors ─────────────────────────────────────────────
    error CourseNotActive();
    error AlreadyPurchased();
    error NotCourseAuthor();
    error InvalidPrice();
    error TransferFailed();

    constructor(address _mtToken, address initialOwner) Ownable(initialOwner) {
        mtToken = IERC20(_mtToken);
    }

    // ─── 课程管理 ────────────────────────────────────────────

    /**
     * @dev 创建课程并上链
     * @param price 课程价格（MT 最小单位）
     * @param metaHash 元数据 hash
     */
    function createCourse(uint256 price, bytes32 metaHash) external returns (uint256 courseId) {
        if (price == 0) revert InvalidPrice();

        courseId = ++courseCount;
        courses[courseId] = Course({
            id: courseId,
            author: msg.sender,
            price: price,
            metaHash: metaHash,
            isActive: true,
            createdAt: block.timestamp
        });
        _authorCourses[msg.sender].push(courseId);

        emit CourseCreated(courseId, msg.sender, price, metaHash);
    }

    /**
     * @dev 更新课程价格和元数据（仅作者）
     */
    function updateCourse(uint256 courseId, uint256 newPrice, bytes32 newMetaHash) external {
        Course storage course = courses[courseId];
        if (course.author != msg.sender) revert NotCourseAuthor();
        if (newPrice == 0) revert InvalidPrice();

        course.price = newPrice;
        course.metaHash = newMetaHash;

        emit CourseUpdated(courseId, newPrice, newMetaHash);
    }

    /**
     * @dev 下架课程（仅作者）
     */
    function deactivateCourse(uint256 courseId) external {
        Course storage course = courses[courseId];
        if (course.author != msg.sender) revert NotCourseAuthor();
        course.isActive = false;
        emit CourseDeactivated(courseId);
    }

    // ─── 购买 ────────────────────────────────────────────────

    /**
     * @dev 购买课程（Checks-Effects-Interactions 模式防重入）
     * 调用前需先 approve(CourseManager, price)
     */
    function purchaseCourse(uint256 courseId) external nonReentrant {
        Course storage course = courses[courseId];

        // Checks
        if (!course.isActive) revert CourseNotActive();
        if (hasPurchased[msg.sender][courseId]) revert AlreadyPurchased();

        // Effects
        hasPurchased[msg.sender][courseId] = true;
        _userPurchases[msg.sender].push(courseId);

        // Interactions
        bool success = mtToken.transferFrom(msg.sender, course.author, course.price);
        if (!success) revert TransferFailed();

        emit CoursePurchased(courseId, msg.sender, course.price);
    }

    // ─── 查询 ─────────────────────────────────────────────────

    function getUserPurchases(address user) external view returns (uint256[] memory) {
        return _userPurchases[user];
    }

    function getAuthorCourses(address author) external view returns (uint256[] memory) {
        return _authorCourses[author];
    }

    function checkPurchase(address user, uint256 courseId) external view returns (bool) {
        return hasPurchased[user][courseId];
    }
}
