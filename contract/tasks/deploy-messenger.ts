import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import * as fs from 'fs'
import * as path from 'path'

task('deploy-messenger', 'Deploy fast sealoutput messenger contract').setAction(
  async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre
    const [deployer] = await ethers.getSigners()

    console.log(`Deploying fast PrivateMessenger to ${network.name}...`)
    console.log(`Deploying with account: ${deployer.address}`)

    const Factory = await ethers.getContractFactory('PrivateMessenger')
    const contract = await Factory.deploy()
    await contract.waitForDeployment()

    const address = await contract.getAddress()
    console.log(`Fast PrivateMessenger deployed to: ${address}`)

    // Save deployment
    const deploymentsDir = path.join(__dirname, '..', 'deployments')
    if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir)
    const deploymentFile = path.join(deploymentsDir, `${network.name}.json`)
    const existing = fs.existsSync(deploymentFile)
      ? JSON.parse(fs.readFileSync(deploymentFile, 'utf8'))
      : {}
    existing['PrivateMessenger'] = address
    fs.writeFileSync(deploymentFile, JSON.stringify(existing, null, 2))
    console.log(`Deployment saved to ${deploymentFile}`)

    const frontendEnv = path.join(__dirname, '..', '..', 'frontend', '.env')
    fs.writeFileSync(
      frontendEnv,
      `VITE_CONTRACT_ADDRESS=${address}\nVITE_NETWORK=arb_sepolia\n`
    )
    console.log(`Updated frontend/.env with fast contract address`)
  }
)
