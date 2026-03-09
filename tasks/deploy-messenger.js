const { task } = require("hardhat/config");
const fs = require("fs");
const path = require("path");

task("deploy-messenger", "Deploy PrivateMessenger contract").setAction(async (_, hre) => {
  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying PrivateMessenger to ${network.name}...`);
  console.log(`Deployer: ${deployer.address}`);

  const Factory = await ethers.getContractFactory("PrivateMessenger");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`PrivateMessenger deployed to: ${address}`);

  // Save deployment
  const deploymentsDir = path.join(__dirname, "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);
  const file = path.join(deploymentsDir, `${network.name}.json`);
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
  existing.PrivateMessenger = address;
  fs.writeFileSync(file, JSON.stringify(existing, null, 2));
  console.log(`Saved to deployments/${network.name}.json`);

  // Also update frontend .env
  const frontendEnv = path.join(__dirname, "..", "frontend", ".env");
  fs.writeFileSync(frontendEnv, `VITE_CONTRACT_ADDRESS=${address}\nVITE_NETWORK=arb_sepolia\n`);
  console.log(`Updated frontend/.env with contract address`);
});
