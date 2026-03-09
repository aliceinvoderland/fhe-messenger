require("@nomicfoundation/hardhat-toolbox");
require("cofhe-hardhat-plugin");
require("dotenv").config();
require("./tasks/deploy-messenger");

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "0".repeat(64);
const ARB_SEPOLIA_RPC = process.env.ARB_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.25",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: { chainId: 31337 },
    "arb-sepolia": {
      url: ARB_SEPOLIA_RPC,
      chainId: 421614,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
  },
};
