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
    }

    uint256 public nextCourseId;

    mapping(uint256 => Course) public courses;
    mapping(address => mapping(uint256 => bool)) public hasAccess;

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
            active: true
        });

        emit CourseCreated(nextCourseId, title, description, price);
        nextCourseId++;
    }

    function buyCourse(uint256 courseId) external {
        Course memory course = courses[courseId];

        require(course.active, "Course is not active");
        require(bytes(course.title).length > 0, "Course does not exist");
        require(!hasAccess[msg.sender][courseId], "Already purchased");

        bool success = paymentToken.transferFrom(msg.sender, owner, course.price);
        require(success, "Token payment failed");

        hasAccess[msg.sender][courseId] = true;

        emit CoursePurchased(msg.sender, courseId, course.price);
    }

    function checkAccess(address user, uint256 courseId) external view returns (bool) {
        return hasAccess[user][courseId];
    }

    function setCourseActive(uint256 courseId, bool active) external onlyOwner {
        require(bytes(courses[courseId].title).length > 0, "Course does not exist");

        courses[courseId].active = active;
        emit CourseStatusChanged(courseId, active);
    }

    function updateCoursePrice(uint256 courseId, uint256 newPrice) external onlyOwner {
        require(bytes(courses[courseId].title).length > 0, "Course does not exist");
        require(newPrice > 0, "Price must be > 0");

        uint256 oldPrice = courses[courseId].price;
        courses[courseId].price = newPrice;

        emit CoursePriceUpdated(courseId, oldPrice, newPrice);
    }
}