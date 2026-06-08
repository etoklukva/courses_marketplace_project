// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IERC20.sol";

contract CourseMarketplace {
    IERC20 public paymentToken;
    address public owner;

    struct Course {
        uint256 id;
        string title;
        string description;
        uint256 price;
        bool active;
        bool exists;
        bool deleted;
    }

    struct CourseBlock {
        uint256 id;
        string title;
        bytes32 contentHash;
        bool exists;
        bool deleted;
    }

    uint256 public nextCourseId;

    mapping(uint256 => Course) public courses;
    mapping(address => mapping(uint256 => bool)) public hasAccess;

    mapping(uint256 => uint256) public courseBlockCount;
    mapping(uint256 => mapping(uint256 => CourseBlock)) public courseBlocks;

    event CourseCreated(
        uint256 indexed id,
        string title,
        string description,
        uint256 price
    );

    event CoursePurchased(
        address indexed buyer,
        uint256 indexed courseId,
        uint256 price
    );

    event CourseStatusChanged(
        uint256 indexed courseId,
        bool active
    );

    event CoursePriceUpdated(
        uint256 indexed courseId,
        uint256 oldPrice,
        uint256 newPrice
    );

    event CourseDeleted(uint256 indexed courseId);

    event CourseBlockAdded(
        uint256 indexed courseId,
        uint256 indexed blockId,
        string title
    );

    event CourseBlockDeleted(
        uint256 indexed courseId,
        uint256 indexed blockId
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor(address tokenAddress) {
        require(tokenAddress != address(0), "Invalid token address");
        paymentToken = IERC20(tokenAddress);
        owner = msg.sender;
    }

    function createCourse(
        string memory title,
        string memory description,
        uint256 price
    ) external onlyOwner {
        require(bytes(title).length > 0, "Empty title");
        require(bytes(description).length > 0, "Empty description");
        require(price > 0, "Price must be > 0");

        courses[nextCourseId] = Course({
            id: nextCourseId,
            title: title,
            description: description,
            price: price,
            active: true,
            exists: true,
            deleted: false
        });

        emit CourseCreated(nextCourseId, title, description, price);
        nextCourseId++;
    }

    function buyCourse(uint256 courseId) external {
        Course memory course = courses[courseId];

        require(course.exists, "Course does not exist");
        require(!course.deleted, "Course deleted");
        require(course.active, "Course is not active");
        require(!hasAccess[msg.sender][courseId], "Already purchased");

        bool success = paymentToken.transferFrom(msg.sender, owner, course.price);
        require(success, "Token payment failed");

        hasAccess[msg.sender][courseId] = true;

        emit CoursePurchased(msg.sender, courseId, course.price);
    }

    function checkAccess(address user, uint256 courseId) external view returns (bool) {
        require(courses[courseId].exists, "Course does not exist");
        require(!courses[courseId].deleted, "Course deleted");
        if (user == owner) {
            return true;
        }
        return hasAccess[user][courseId];
    }

    function setCourseActive(uint256 courseId, bool active) external onlyOwner {
        require(courses[courseId].exists, "Course does not exist");
        require(!courses[courseId].deleted, "Course deleted");

        courses[courseId].active = active;
        emit CourseStatusChanged(courseId, active);
    }

    function updateCoursePrice(uint256 courseId, uint256 newPrice) external onlyOwner {
        require(courses[courseId].exists, "Course does not exist");
        require(!courses[courseId].deleted, "Course deleted");
        require(newPrice > 0, "Price must be > 0");

        uint256 oldPrice = courses[courseId].price;
        courses[courseId].price = newPrice;

        emit CoursePriceUpdated(courseId, oldPrice, newPrice);
    }

    function deleteCourse(uint256 courseId) external onlyOwner {
        require(courses[courseId].exists, "Course does not exist");
        require(!courses[courseId].deleted, "Course already deleted");

        courses[courseId].deleted = true;
        courses[courseId].active = false;

        emit CourseDeleted(courseId);
    }

    function addCourseBlock(
        uint256 courseId,
        string memory blockTitle,
        bytes32 contentHash
    ) external onlyOwner {
        require(courses[courseId].exists, "Course does not exist");
        require(!courses[courseId].deleted, "Course deleted");
        require(bytes(blockTitle).length > 0, "Empty block title");
        require(contentHash != bytes32(0), "Empty content hash");

        uint256 blockId = courseBlockCount[courseId];

        courseBlocks[courseId][blockId] = CourseBlock({
            id: blockId,
            title: blockTitle,
            contentHash: contentHash,
            exists: true,
            deleted: false
        });

        courseBlockCount[courseId]++;

        emit CourseBlockAdded(courseId, blockId, blockTitle);
    }

    function deleteCourseBlock(uint256 courseId, uint256 blockId) external onlyOwner {
        require(courses[courseId].exists, "Course does not exist");
        require(!courses[courseId].deleted, "Course deleted");
        require(blockId < courseBlockCount[courseId], "Block does not exist");
        require(courseBlocks[courseId][blockId].exists, "Block does not exist");
        require(!courseBlocks[courseId][blockId].deleted, "Block already deleted");

        courseBlocks[courseId][blockId].deleted = true;

        emit CourseBlockDeleted(courseId, blockId);
    }

    function getCourseBlock(uint256 courseId, uint256 blockId)
        external
        view
        returns (
            uint256 id,
            string memory title,
            bytes32 contentHash,
            bool deleted
        )
    {
        require(courses[courseId].exists, "Course does not exist");
        require(!courses[courseId].deleted, "Course deleted");
        require(blockId < courseBlockCount[courseId], "Block does not exist");
        require(courseBlocks[courseId][blockId].exists, "Block does not exist");

        CourseBlock memory blockData = courseBlocks[courseId][blockId];
        return (
            blockData.id,
            blockData.title,
            blockData.contentHash,
            blockData.deleted
        );
    }
}