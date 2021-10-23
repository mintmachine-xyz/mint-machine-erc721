import { ethers } from "hardhat";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { MintMachineERC721FiniteSequence } from "../typechain/MintMachineERC721FiniteSequence";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { parseEther } from "@ethersproject/units"

import { hexToBytes } from 'web3-utils'

chai.use(chaiAsPromised);
const { expect } = chai;

enum ContractState {
    PAUSED,
    PRIVATE,
    PUBLIC,
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

describe("Metadata", () => {
    let contract: MintMachineERC721FiniteSequence;
    let owner: SignerWithAddress
    let nonOwner: SignerWithAddress
    let thirdParty: SignerWithAddress
    const mintedTokenId = 0;
    const maximumSupply = 100;
    const publicMintPrice = parseEther("0")
    const maximumPublicTokensPerTransaction = 5


    beforeEach(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        nonOwner = signers[1];
        thirdParty = signers[2];

        const contractFactory = await ethers.getContractFactory(
            "MintMachineERC721FiniteSequence",
            owner
        );

        contract = (await contractFactory.deploy(
            "Test Contract",
            "TC",
            maximumSupply,
            publicMintPrice,
            maximumPublicTokensPerTransaction,
            owner.address, // verification address
            "",
            ""
        )) as MintMachineERC721FiniteSequence;

        await contract.deployed();

        await contract.mintToAddress(owner.address, 1);
        expect(contract.address).to.properAddress;

    })

    // Helpers
    async function signMintWithSignature({ tokenCount, paymentAmount, mintKey, signer, caller }: { tokenCount: number; paymentAmount: BigNumberish; mintKey: string; signer: SignerWithAddress, caller: SignerWithAddress }) {
        const message =
            ethers.utils.solidityKeccak256(
                ['bytes'],
                [
                    ethers.utils.solidityPack(
                        ['address', 'uint256', 'uint256', 'address', 'address'],
                        [caller.address, tokenCount, paymentAmount, mintKey, contract.address]
                    )
                ]
            )
        return await signer.signMessage(hexToBytes(message))
    }


    async function callMintWithSignature({ tokenCount, paymentAmount = 0, mintKey = "0x8D81A3DCd17030cD5F23Ac7370e4Efb10D2b3cA4", signer = owner, caller = nonOwner, value }: { tokenCount: number; paymentAmount?: BigNumberish; mintKey?: string; signer?: SignerWithAddress, caller?: SignerWithAddress, value?: BigNumberish }) {

        const signature = await signMintWithSignature({ tokenCount, paymentAmount, mintKey, signer, caller })

        if (value) {
            return await contract.connect(caller).mintWithSignature(tokenCount, paymentAmount, mintKey, signature, { value })
        } else {
            return await contract.connect(caller).mintWithSignature(tokenCount, paymentAmount, mintKey, signature)

        }
    }


    // Describes


    describe("#constructor", async () => {


        beforeEach(async () => {

            const contractFactory = await ethers.getContractFactory(
                "MintMachineERC721FiniteSequence",
                owner
            );

            contract = (await contractFactory.deploy(
                "Constructor Test",
                "CTC",
                200,
                parseEther("0.25"),
                12,
                owner.address, // verification address
                "https://test.local/base",
                "https://test.local/contract"
            )) as MintMachineERC721FiniteSequence;
        })
        it("sets Name", async () => {
            expect(await contract.name()).to.eq("Constructor Test");
        });
        it("sets Symbol", async () => {
            expect(await contract.symbol()).to.eq("CTC");
        });
        it("sets maximumSupply", async () => {
            expect(await contract.maximumSupply()).to.eq(200);
        });

        it("requires max supply to be greater than 0", async () => {
            const contractFactory = await ethers.getContractFactory(
                "MintMachineERC721FiniteSequence",
                owner
            );

            await expect(
                contractFactory.deploy("No Supply", "TC_NS", 0, 0, 0, owner.address, "", "")
            ).to.eventually.be.rejectedWith(Error, "Maximum token supply must be greater than 0");

        })

        it("sets publicMintPrice", async () => {
            expect(await contract.publicMintPrice()).to.eq(parseEther("0.25"));
        });

        it("sets maximumPublicTokensPerTransaction", async () => {
            expect(await contract.maximumPublicTokensPerTransaction()).to.eq(12);
        });

        it("sets verificationAddress", async () => {
            await contract.setState(ContractState.PRIVATE)

            await callMintWithSignature({ tokenCount: 1 })
            expect(await contract.balanceOf(nonOwner.address)).to.eq(1)
        });

        it("sets baseURI", async () => {
            expect(await contract.baseURI()).to.eq("https://test.local/base");
        });

        it("sets contractURI", async () => {
            expect(await contract.contractURI()).to.eq("https://test.local/contract");
        });

    })

    describe("CONFIG", async () => {

        describe("#freezeBaseURI", async () => {
            it("freezes metadata", async () => {
                await contract.freezeBaseURI()
                expect(await contract.isBaseURIFrozen()).to.eql(true)
            })

            it("raises error if contract already frozen", async () => {
                await contract.freezeBaseURI()
                await expect(contract.freezeBaseURI()).to.eventually.rejectedWith(Error, "baseURI is frozen")

            })

            it("restricts to owner", async () => {
                await expect(contract.connect(nonOwner).freezeBaseURI()).to.eventually.be.rejectedWith(Error, 'Ownable: caller is not the owner');
            })
        })

        describe("#setBaseURI", async () => {
            it("sets the _uri", async () => {
                await contract.setBaseURI("https://test.local/customURI/");
                expect(await contract.tokenURI(0)).to.eq("https://test.local/customURI/0");
            })
            it("restricts to owner", async () => {
                await expect(contract.connect(nonOwner).setBaseURI("rogueURI")).to.eventually.be.rejectedWith(Error, 'Ownable: caller is not the owner');
            })
            it("raises error if metadata frozen", async () => {
                await contract.setBaseURI("https://test.local/customURI/");
                await contract.freezeBaseURI()

                await expect(contract.setBaseURI("https://test.local/newURI/")).to.eventually.rejectedWith(Error, "baseURI is frozen")
            })

        })

        describe("#setContractURI", async () => {
            it("sets the _contractURI", async () => {
                await contract.setContractURI("https://test.local/contract");
                expect(await contract.contractURI()).to.eq("https://test.local/contract");
            })

            it("restricts to owner", async () => {
                await expect(contract.connect(nonOwner).setContractURI("rogueURI")).to.eventually.be.rejectedWith(Error, 'Ownable: caller is not the owner');
            })

        })




        describe("#setMaximumPublicTokensPerTransaction", async () => {
            it("set the maximum number of tokens per transaction", async () => {
                await contract.setMaximumPublicTokensPerTransaction(5)

                expect(await contract.maximumPublicTokensPerTransaction()).to.eq(5);
            })

            it("set the maximum number of tokens per transaction to zero", async () => {

                await contract.setMaximumPublicTokensPerTransaction(5)
                await contract.setMaximumPublicTokensPerTransaction(0)
                expect(await contract.maximumPublicTokensPerTransaction()).to.eq(0);
            })

            it("restricts to owner", async () => {
                await expect(contract.connect(nonOwner).setMaximumPublicTokensPerTransaction(10)).to.eventually.be.rejectedWith(Error, 'Ownable: caller is not the owner');
            })
        })



        describe("#setPublicMintPrice", async () => {
            it("set the mint price", async () => {
                await contract.setPublicMintPrice(parseEther("0.03"))

                expect(await contract.publicMintPrice()).to.eq(parseEther("0.03"));
            })

            it("set the mint price to zero", async () => {
                await contract.setPublicMintPrice(parseEther("0.03"))
                await contract.setPublicMintPrice(0)
                expect(await contract.publicMintPrice()).to.eq(0);
            })
            it("restricts to owner", async () => {
                await expect(contract.connect(nonOwner).setPublicMintPrice(parseEther("0.03"))).to.eventually.be.rejectedWith(Error, 'Ownable: caller is not the owner');
            })
        })

        describe("#setState", async () => {
            it("sets the contract state to PAUSED", async () => {
                await contract.setState(ContractState.PAUSED)

                expect(await contract.getState()).to.eq(ContractState.PAUSED);
            })

            it("emits StateChanged event for PAUSED", async () => {
                await expect(contract.setState(ContractState.PAUSED))
                    .to.emit(contract, 'StateChanged')
                    .withArgs(ContractState.PAUSED)
            })

            it("sets the contract state to PRIVATE", async () => {
                await contract.setState(ContractState.PRIVATE)
                expect(await contract.getState()).to.eq(ContractState.PRIVATE);

            })

            it("emits StateChanged event for PRIVATE", async () => {
                await expect(contract.setState(ContractState.PRIVATE))
                    .to.emit(contract, 'StateChanged')
                    .withArgs(ContractState.PRIVATE)
            })

            it("sets the contract state to PUBLIC", async () => {
                await contract.setState(ContractState.PUBLIC)
                expect(await contract.getState()).to.eq(ContractState.PUBLIC);

            })

            it("emits StateChanged event for PUBLIC", async () => {
                await expect(contract.setState(ContractState.PUBLIC))
                    .to.emit(contract, 'StateChanged')
                    .withArgs(ContractState.PUBLIC)
            })


            it("error for invalid state", async () => {
                await expect(contract.setState(10)).to.eventually.be.rejectedWith(Error, 'Transaction reverted: function was called with incorrect parameters');
            })

            it("restricts to owner", async () => {
                await expect(contract.connect(nonOwner).setState(ContractState.PAUSED)).to.eventually.be.rejectedWith(Error, 'Ownable: caller is not the owner');
            })
        })

        describe("#setVerificationAddress", async () => {


            it("set the verification address", async () => {
                await contract.setVerificationAddress(owner.address);
            })

            it("set the verification address to zero", async () => {
                await contract.setVerificationAddress(ZERO_ADDRESS);
            })

            it("restricts to owner", async () => {
                await expect(contract.connect(nonOwner).setVerificationAddress(nonOwner.address)).to.eventually.be.rejectedWith(Error, 'Ownable: caller is not the owner');
            })
        })

    })

    describe("payment management", async () => {
        describe("#withdraw", async () => {

            beforeEach(async () => {
                // config contract to accept mint
                await contract.setState(ContractState.PUBLIC)
                await contract.setPublicMintPrice(parseEther("0.03"))

            })

            it("allows owner to withdraw funds", async () => {
                await contract.connect(nonOwner).mint(2, { value: parseEther("0.06") })
                await expect(await contract.withdraw()).to.changeEtherBalance(owner, parseEther("0.06"));

            })

            it("does nothing if contract has no funds", async () => {

                await expect(await contract.withdraw()).to.changeEtherBalance(contract, parseEther("0"));


            })


            it("restricts to owner", async () => {
                await contract.connect(nonOwner).mint(1, { value: parseEther("0.03") })
                await expect(contract.connect(nonOwner).withdraw()).to.eventually.be.rejectedWith(Error, 'Ownable: caller is not the owner');
            })

        })
    })

    describe("public accessors", async () => {

        describe("#availableSupply", async () => {
            it("returns remaining tokens to mint ", async () => {
                expect(await contract.availableSupply()).to.eq(99);
            });

        })


        describe("#baseURI", async () => {
            it("defaults to empty string ", async () => {
                expect(await contract.baseURI()).to.eq("");
            });

            it("returns base uri", async () => {
                await contract.setBaseURI("https://test.local/base")
                expect(await contract.baseURI()).to.eq("https://test.local/base");
            });

        })


        describe("#contractURI", async () => {
            it("defaults to empty string ", async () => {
                expect(await contract.contractURI()).to.eq("");
            });

            it("returns contract uri", async () => {
                await contract.setContractURI("https://test.local/contract")
                expect(await contract.contractURI()).to.eq("https://test.local/contract");
            });

        })
        describe("#getState", async () => {
            it("return state", async () => {
                expect(await contract.getState()).to.eq(ContractState.PAUSED);
            });

        })


        describe("#isClaimed", async () => {
            it("return false for unclaimed", async () => {
                const unclaimedKey = "0xcD0048A5628B37B8f743cC2FeA18817A29e97270"
                expect(await contract.isClaimed(unclaimedKey)).to.eq(false);
            });

            it("returns true for claimed key", async () => {
                await contract.setState(ContractState.PRIVATE)

                const claimedKey = "0x967AB65ef14c58bD4DcfFeaAA1ADb40a022140E5"
                await callMintWithSignature({ tokenCount: 1, mintKey: claimedKey })

                expect(await contract.isClaimed(claimedKey)).to.eq(true);

            })

        })

        describe("#isBaseURIFrozen", async () => {
            it("returns true if metadata frozen", async () => {
                await contract.freezeBaseURI()
                expect(await contract.isBaseURIFrozen()).to.eql(true)
            })
            it("returns false if metadata is not", async () => {
                expect(await contract.isBaseURIFrozen()).to.eql(false)
            })
        })



        describe("#maximumSupply", async () => {
            it("return maximum supply", async () => {
                expect(await contract.maximumSupply()).to.eq(100);
            });

        })

        describe("#publicMintPrice", async () => {
            it("returns the default mint price", async () => {
                expect(await contract.publicMintPrice()).to.eq(0);
            });

            it("returns the mint price", async () => {
                await contract.setPublicMintPrice(parseEther("0.03"))
                expect(await contract.publicMintPrice()).to.eq(parseEther("0.03"));
            });

        })

        describe("#totalSupply", async () => {
            it("return total supply (minted)", async () => {
                expect(await contract.totalSupply()).to.eq(1);
            });

        })


    })



    describe("#tokenURI", async () => {

        it("return empty string when _uri not set", async () => {
            expect(await contract.tokenURI(mintedTokenId)).to.eq("");
        });


        it("returns baseUri + tokenId", async () => {
            await contract.setBaseURI("https://test.local/meta/");

            await contract.tokenURI(mintedTokenId);
            expect(await contract.tokenURI(0)).to.eq("https://test.local/meta/0");
        });

        it("returns error when token not minted", async () => {
            await contract.setBaseURI("https://test.local/meta/");

            await expect(contract.tokenURI(455)).to.eventually.be.rejectedWith(Error, 'ERC721Metadata: URI query for nonexistent token');

        });
    });

    describe("MINTING", async () => {


        describe("#mint", async () => {



            it("raises error when state == PAUSED", async () => {
                await contract.setState(ContractState.PAUSED)
                await expect(
                    contract.connect(nonOwner).mint(1)
                ).to.eventually.be.rejectedWith(Error, 'public minting is disabled');

            })




            it("raises error when state == PRIVATE", async () => {
                await contract.setState(ContractState.PRIVATE)
                await expect(
                    contract.connect(nonOwner).mint(1)
                ).to.eventually.be.rejectedWith(Error, 'public minting is disabled');

            })




            describe("state == PUBLIC", async () => {

                beforeEach(async () => {
                    await contract.setState(ContractState.PUBLIC)
                })

                it("mints token", async () => {
                    await contract.connect(nonOwner).mint(2);

                    expect((await contract.balanceOf(nonOwner.address))).to.eq(2);

                    expect((await contract.totalSupply())).to.eq(3);
                })

                it("emits Transfer event", async () => {

                    const transaction = contract.connect(nonOwner).mint(2)

                    await expect(transaction)
                        .to.emit(contract, 'Transfer')
                        .withArgs(ZERO_ADDRESS, nonOwner.address, 1)
                    await expect(transaction)
                        .to.emit(contract, 'Transfer')
                        .withArgs(ZERO_ADDRESS, nonOwner.address, 2)

                })

                it("raises error if tokenCount is zero", async () => {
                    await expect(
                        contract.connect(nonOwner).mint(0)
                    ).to.eventually.be.rejectedWith(Error, 'tokenCount must be greater than zero');

                })

                it("raises error if tokenCount is exceeds available supply", async () => {

                    await contract.mintToAddress(owner.address, 98) // TODO slow b/c for loop

                    await expect(
                        contract.connect(nonOwner).mint(3)
                    ).to.eventually.be.rejectedWith(Error, 'tokenCount exceeds available supply');

                })

                it("raises error if tokenCount exceeds max mint per transaction", async () => {
                    await contract.setMaximumPublicTokensPerTransaction(5);
                    await expect(
                        contract.connect(nonOwner).mint(10)
                    ).to.eventually.be.rejectedWith(Error, 'tokenCount exceeds per transaction limit');

                })

                it("does not restrict the number of tokens per transaction if the per transaction limit is set to zero", async () => {
                    await contract.setMaximumPublicTokensPerTransaction(0);

                    await contract.connect(nonOwner).mint(10)
                    expect((await contract.balanceOf(nonOwner.address))).to.eq(10);


                })

                it("raises error if payment sent", async () => {
                    await expect(
                        contract.connect(nonOwner).mint(1, { value: parseEther("0.03") })
                    ).to.eventually.be.rejectedWith(Error, 'payable does match require amount');
                })



                describe("with required payment", async () => {

                    beforeEach(async () => {
                        await contract.setState(ContractState.PUBLIC)

                        await contract.setPublicMintPrice(parseEther("0.03"))

                    })

                    it("takes payment", async () => {
                        expect(await contract.connect(nonOwner).mint(1, { value: parseEther("0.03") })).to.changeEtherBalance(contract, parseEther("0.03"))
                        expect(await contract.balanceOf(nonOwner.address)).to.eq(1)

                    })


                    it("takes payment for multiple tokens", async () => {
                        await contract.connect(nonOwner).mint(2, { value: parseEther("0.06") })
                        expect(await contract.balanceOf(nonOwner.address)).to.eq(2)

                    })

                    it("raises error if no payment sent", async () => {
                        await expect(
                            contract.connect(nonOwner).mint(1)
                        ).to.eventually.be.rejectedWith(Error, 'payable does match require amount');

                    })

                    it("raises error for underpayment", async () => {

                        await expect(
                            contract.connect(nonOwner).mint(2, { value: parseEther("0.03") })
                        ).to.eventually.be.rejectedWith(Error, 'payable does match require amount');

                    })

                    it("raises error for overpayment", async () => {
                        await expect(
                            contract.connect(nonOwner).mint(1, { value: parseEther("0.06") })
                        ).to.eventually.be.rejectedWith(Error, 'payable does match require amount');

                    })

                    it("raises error for overflow", async () => {

                        await contract.setPublicMintPrice(BigNumber.from(2).pow(256).sub(1))


                        await expect(
                            contract.connect(nonOwner).mint(2, { value: 0 })
                        ).to.eventually.be.rejectedWith(Error, 'VM Exception while processing transaction: reverted with panic code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)');

                    })

                })

            })


        })



        describe("#mintWithSignature", async () => {




            it("raises error when minting disable", async () => {
                await expect(
                    callMintWithSignature({ tokenCount: 1 })
                ).to.eventually.be.rejectedWith(Error, 'minting is disabled');
            })

            it("raises error when minting disable", async () => {
                await expect(
                    callMintWithSignature({ tokenCount: 1 })
                ).to.eventually.be.rejectedWith(Error, 'minting is disabled');
            })

            it("raises error when no verification address is present", async () => {
                await contract.setState(ContractState.PRIVATE)
                await contract.setVerificationAddress(ZERO_ADDRESS);

                await expect(
                    callMintWithSignature({ tokenCount: 1 })
                ).to.eventually.be.rejectedWith(Error, 'verification address not set');
            })


            describe("state == PRIVATE", async () => {
                beforeEach(async () => {
                    await contract.setState(ContractState.PRIVATE)
                })

                it("mints with signature", async () => {
                    await callMintWithSignature({ tokenCount: 1 })
                    expect(await contract.balanceOf(nonOwner.address)).to.eq(1)
                })

                it("emits MintKeyClaimed event", async () => {

                    // TODO -- claimed? Authorized
                    const mintKey = "0x8D81A3DCd17030cD5F23Ac7370e4Efb10D2b3cA4"
                    await expect(callMintWithSignature({ tokenCount: 3 }))
                        .to.emit(contract, 'MintKeyClaimed')
                        .withArgs(nonOwner.address, mintKey, 3)
                })

                it("emits Transfer event", async () => {
                    await expect(callMintWithSignature({ tokenCount: 1 }))
                        .to.emit(contract, 'Transfer')
                        .withArgs(ZERO_ADDRESS, nonOwner.address, 1)
                })


                it("mints with signature and payment", async () => {
                    await callMintWithSignature({ tokenCount: 1, paymentAmount: parseEther("0.03"), value: parseEther("0.03") })
                    expect(await contract.balanceOf(nonOwner.address)).to.eq(1)
                })

                it("raises error if payment is missing", async () => {

                    await expect(
                        callMintWithSignature({ tokenCount: 1, paymentAmount: parseEther("0.03") })
                    ).to.eventually.be.rejectedWith(Error, 'payable does match require amount');

                })

                it("raises error for underpayment", async () => {

                    await expect(
                        callMintWithSignature({ tokenCount: 1, paymentAmount: parseEther("0.03"), value: parseEther("0.02") })
                    ).to.eventually.be.rejectedWith(Error, 'payable does match require amount');



                })

                it("raises error for overpayment", async () => {

                    await expect(
                        callMintWithSignature({ tokenCount: 1, paymentAmount: parseEther("0.03"), value: parseEther("0.04") })

                    ).to.eventually.be.rejectedWith(Error, 'payable does match require amount');



                })

                it("raises error if tokenCount is zero", async () => {

                    await expect(
                        callMintWithSignature({ tokenCount: 0 })
                    ).to.eventually.be.rejectedWith(Error, 'tokenCount must be greater than zero');

                })

                it("raises error if tokenCount is exceeds available supply", async () => {

                    await contract.mintToAddress(owner.address, 98) // TODO slow b/c for loop

                    await expect(
                        callMintWithSignature({ tokenCount: 3 })
                    ).to.eventually.be.rejectedWith(Error, 'tokenCount exceeds available supply');

                })



                it("reject duplicate mintKey", async () => {
                    const mintKey = "0xC1e0A9DB9eA830c52603798481045688c8AE99C2"
                    callMintWithSignature({ tokenCount: 1, mintKey })

                    await expect(
                        callMintWithSignature({ tokenCount: 1, mintKey })
                    ).to.eventually.be.rejectedWith(Error, 'mintKey already claimed');

                })



                it("allows multiple keys for senderr", async () => {

                    await callMintWithSignature({ tokenCount: 1, mintKey: "0xC1e0A9DB9eA830c52603798481045688c8AE99C2" })
                    expect(await contract.balanceOf(nonOwner.address)).to.eq(1)

                    await callMintWithSignature({ tokenCount: 1, mintKey: "0x967AB65ef14c58bD4DcfFeaAA1ADb40a022140E5" })
                    expect(await contract.balanceOf(nonOwner.address)).to.eq(2)

                })

                it("reject if signature invalid", async () => {
                    await expect(
                        callMintWithSignature({ tokenCount: 1, signer: nonOwner })
                    ).to.eventually.be.rejectedWith(Error, 'signature invalid');
                })



                it("reject if caller invalid", async () => {
                    const mintKey = "0xC1e0A9DB9eA830c52603798481045688c8AE99C2"
                    const signature = await signMintWithSignature({ tokenCount: 1, paymentAmount: 0, mintKey, signer: owner, caller: owner })

                    await expect(
                        contract.connect(nonOwner).mintWithSignature(1, 0, mintKey, signature)
                    ).to.eventually.be.rejectedWith(Error, 'signature invalid');
                })

                it("reject if tokenCount invalid", async () => {
                    const mintKey = "0xC1e0A9DB9eA830c52603798481045688c8AE99C2"

                    const signature = await signMintWithSignature({ tokenCount: 1, paymentAmount: 0, mintKey, signer: owner, caller: nonOwner })

                    await expect(
                        contract.connect(nonOwner).mintWithSignature(2, 0, mintKey, signature)
                    ).to.eventually.be.rejectedWith(Error, 'signature invalid');
                })

                it("reject if paymentAmount invalid", async () => {
                    const mintKey = "0xC1e0A9DB9eA830c52603798481045688c8AE99C2"

                    const signature = await signMintWithSignature({ tokenCount: 1, paymentAmount: 1, mintKey, signer: owner, caller: nonOwner })

                    await expect(
                        contract.connect(nonOwner).mintWithSignature(1, 0, mintKey, signature)
                    ).to.eventually.be.rejectedWith(Error, 'signature invalid');
                })


                it("reject if mintKey invalid", async () => {
                    const mintKey = "0xC1e0A9DB9eA830c52603798481045688c8AE99C2"
                    const invalidMintKey = "0x1D8D70AD07C8E7E442AD78E4AC0A16f958Eba7F0"

                    const signature = await signMintWithSignature({ tokenCount: 1, paymentAmount: 0, mintKey, signer: owner, caller: nonOwner })

                    await expect(
                        contract.connect(nonOwner).mintWithSignature(1, 0, invalidMintKey, signature)
                    ).to.eventually.be.rejectedWith(Error, 'signature invalid');
                })


            })


            describe("state == PUBLIC", async () => {
                it("mints with signature", async () => {

                    await contract.setState(ContractState.PUBLIC)
                    await callMintWithSignature({ tokenCount: 1 })
                    expect(await contract.balanceOf(nonOwner.address)).to.eq(1)
                })

            })



        })




        describe("#mintToAddress", async () => {

            it("mints to address", async () => {
                await contract.mintToAddress(nonOwner.address, 1);
                expect(await contract.balanceOf(nonOwner.address)).to.eq(1)

            })

            it("emits Transfer event", async () => {
                await expect(contract.mintToAddress(nonOwner.address, 1))
                    .to.emit(contract, 'Transfer')
                    .withArgs(ZERO_ADDRESS, nonOwner.address, 1)
            })

            it("restrict to owner", async () => {
                await expect(
                    contract.connect(nonOwner).mintToAddress(nonOwner.address, 1)
                ).to.eventually.be.rejectedWith(Error, 'Ownable: caller is not the owner');

            })

            it("raises error if tokenCount exceeds available supply", async () => {
                await expect(
                    contract.mintToAddress(nonOwner.address, 100)
                ).to.eventually.be.rejectedWith(Error, 'tokenCount exceeds available supply');

            })

            it("raises error if tokenCount is zero", async () => {
                await expect(
                    contract.mintToAddress(nonOwner.address, 0)
                ).to.eventually.be.rejectedWith(Error, 'tokenCount must be greater than zero');

            })

            it("raises error if address is zero", async () => {
                await expect(
                    contract.mintToAddress("0x0000000000000000000000000000000000000000", 1)
                ).to.eventually.be.rejectedWith(Error, 'ERC721: mint to the zero address');

            })
        })

        describe("#transferFrom", async () => {

            it("transfers token", async () => {
                await contract.mintToAddress(nonOwner.address, 1);
                await contract.connect(nonOwner).transferFrom(nonOwner.address, thirdParty.address, 1)

                expect(await contract.ownerOf(1)).to.eq(thirdParty.address)
            })

            it("does not transfer if token not owned", async () => {
                await contract.mintToAddress(nonOwner.address, 1);
                await expect(contract.transferFrom(nonOwner.address, thirdParty.address, 1))
                    .to.eventually.be.rejectedWith(Error, "ERC721: transfer caller is not owner nor approved");

            })

            it("raises error if token not minted", async () => {
                await expect(contract.transferFrom(nonOwner.address, thirdParty.address, 1))
                    .to.eventually.be.rejectedWith(Error, "ERC721: operator query for nonexistent token");

            })

            it(" transfer if approved", async () => {
                await contract.mintToAddress(nonOwner.address, 1);
                await contract.connect(nonOwner).approve(owner.address, 1)

                await contract.transferFrom(nonOwner.address, thirdParty.address, 1)

                expect(await contract.ownerOf(1)).to.eq(thirdParty.address)

            })


        })

        describe("#transferOwnership", async () => {
            it("needs specs")
        })

        describe("#renounceOwnership", async () => {
            it("needs specs")
        })
    });

})