const StudyToken = artifacts.require("StudyToken");

module.exports = async function (deployer) {
  const initialSupply = "1000000000000000000000"; // 1000 STK
  await deployer.deploy(StudyToken, initialSupply);
};