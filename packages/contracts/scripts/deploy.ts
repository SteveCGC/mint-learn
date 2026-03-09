import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  // 1. 部署 MT Token
  const MTToken = await ethers.getContractFactory('MTToken');
  const mtToken = await MTToken.deploy(deployer.address);
  await mtToken.waitForDeployment();
  const mtAddress = await mtToken.getAddress();
  console.log('MTToken deployed to:', mtAddress);

  // 2. 部署 CourseManager
  const CourseManager = await ethers.getContractFactory('CourseManager');
  const courseManager = await CourseManager.deploy(mtAddress, deployer.address);
  await courseManager.waitForDeployment();
  const cmAddress = await courseManager.getAddress();
  console.log('CourseManager deployed to:', cmAddress);

  console.log('\n=== 部署完成，请更新以下环境变量 ===');
  console.log(`NEXT_PUBLIC_MT_TOKEN_ADDRESS=${mtAddress}`);
  console.log(`NEXT_PUBLIC_COURSE_MANAGER_ADDRESS=${cmAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
