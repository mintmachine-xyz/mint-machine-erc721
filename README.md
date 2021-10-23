# MintMachine.xyz ERC 721 (Finite Sequence)

A Solidity ERC 721 contract built to interface with [https://www.mintmachine.xyz](https://www.mintmachine.xyz).

## About Mint Machine

Running a successful NFT drop takes a lot of work. Building the tech to support 
your drop shouldn't be. 

Mint Machine provides ready-made, flexible ERC-721 contracts and infrastructure for managing your NFT drop. 

Mint Machine offers one-click contract deployment, management dashboards, and APIs to make your launch a success. 

Planning a new project? Reach out at [https://www.mintmachine.xyz](https://www.mintmachine.xyz).

## About Contract

The MintMachineERC721 contract is a general purpose ERC-721 contract designed to interface with [https://www.mintmachine.xyz](https://www.mintmachine.xyz), and provide base building blocks for executing a variety of minting strategies.

It provides sequential minting of a finite supply of ERC-721 tokens using three mint functions:

1. `mint( tokenCount )` -- Mints tokenCount tokens in sequence. 
2. `mintWithSignature( tokenCount, valueInWei, mintKey, signature )` -- Signed mint request for a specific token count and value. 
3. `mintToAddress( destination, tokenCount )` -- Mints tokenCount tokens to a specific address. (Owner Restricted)

The contract provides for the ability to pause(disable) the minting process, as well as restrict the public `mint` function, while still allowing signed `mintWithSignature` mints. 

Per transaction token limits and per token price can be configured dynamically. The contract metadata URI and the base URI for the token metadata can be configured dynamically, with an option to permanently freeze the token metadata baseURI. 

The contract emits event logs for tracking signed mints and changes in contract state.



## Key Commands

```
yarn run build
yarn run test

yarn run deploy:rinkeby 

yarn hardhat verify --network rinkeby CONTRACT_ADDRESS

```


## External Resources


[https://erc721validator.org/](https://erc721validator.org/)

[https://github.com/0xcert/ethereum-erc721](https://github.com/0xcert/ethereum-erc721)
