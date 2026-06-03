const StudyToken = artifacts.require("StudyToken");
const CourseMarketplace = artifacts.require("CourseMarketplace");

module.exports = async function (deployer) {
  const token = await StudyToken.deployed();
  await deployer.deploy(CourseMarketplace, token.address);
};