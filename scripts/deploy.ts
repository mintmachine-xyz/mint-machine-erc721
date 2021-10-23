import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

import { ethers } from "hardhat";
import { MintMachineERC721FiniteSequence } from "../typechain/MintMachineERC721FiniteSequence";



interface IMintMachineERC721FiniteSequenceDefinition {
    name: string
    symbol: string
    maximumSupply: number
    publicMintPrice: number
    maximumPublicTokensPerTransaction: number
    verificationAddress: string
    baseURI: string
    contractURI: string
}
async function deploy({ name, symbol, maximumSupply,
    publicMintPrice,
    maximumPublicTokensPerTransaction, verificationAddress, baseURI, contractURI }: IMintMachineERC721FiniteSequenceDefinition): Promise<MintMachineERC721FiniteSequence> {
    const factory = await ethers.getContractFactory("MintMachineERC721FiniteSequence");

    return await factory.deploy(
        name,
        symbol,
        maximumSupply,
        publicMintPrice,
        maximumPublicTokensPerTransaction,
        verificationAddress,
        baseURI,
        contractURI
    ) as MintMachineERC721FiniteSequence;

}


async function main() {

    let contract = await deploy({
        name: "Mint Machine Project",
        symbol: "MM",
        maximumSupply: 1000,
        publicMintPrice: 0,
        maximumPublicTokensPerTransaction: 10,
        verificationAddress:  process.env.VERIFICATION_ADDRESS || "0x0000000000000000000000000000000000000000",
        baseURI: "",
        contractURI: ""
    });

    console.log("Mining....");
    console.log(`Contract address: ${contract.address}`);
    console.log(`Transaction hash: ${contract.deployTransaction.hash}`);

  
    await contract.deployed();
    console.log('Mined!');
}


main().then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });