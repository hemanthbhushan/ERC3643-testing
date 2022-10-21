const { expect } = require("chai");
const { zeroAddress } = require("ethereumjs-util");
const { ethers, network } = require("hardhat");
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace");



describe("testing for claim TOpic registry ",()=>{
  let claimTopicsRegistry,ower,signer1,signer2,owner;


  beforeEach(async()=>{
    [owner,signer1,signer2] = await ethers.getSigners();
    
    const _ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
    claimTopicsRegistry = await _ClaimTopicsRegistry.connect(signer1).deploy();

  })

  it("add claim topic should only called by the owner of the contract",async()=>{
    await claimTopicsRegistry.connect(signer1).addClaimTopic(1);
  })
  it("if tries to add the existing claim it should revert",async ()=>{
    await claimTopicsRegistry.connect(signer1).addClaimTopic(1);
    expect(claimTopicsRegistry.connect(signer1).addClaimTopic(1)).to.be.revertedWith("claimTopic already exists");
  })
  it("claim should be removed if already existing claim is removed",async ()=>{
    await claimTopicsRegistry.connect(signer1).addClaimTopic(1);
   await claimTopicsRegistry.connect(signer1).removeClaimTopic(1);
  })
  it("it will be rejected if the non owner is called",async()=>{
    expect( claimTopicsRegistry.connect(signer2).addClaimTopic(1)).to.be.revertedWith('claimTopic already exists');
  })

})


//testing for the identity registry
describe("testing",()=>{
  // let identityRegistry,identityRegistryStorage,tokenName,
  let claimTopicsRegistry;
  let identityRegistry;
  let identityRegistryStorage;
  let trustedIssuersRegistry;
  let claimIssuerContract;
  let signer1;
  let signer2;
  let signer3;
  let owner;
  let agent;
  let identityHolder1,identityHolder2,identityHolder3;

  


  beforeEach(async ()=>{
    [owner,signer1,signer2,agent] = await ethers.getSigners();

    const TrustedIssuersRegistry = await ethers.getContractFactory("TrustedIssuersRegistry");
    trustedIssuersRegistry = await TrustedIssuersRegistry.deploy();
    await trustedIssuersRegistry.deployed();

    const ClaimTopicsRegistry = await ethers.getContractFactory("ClaimTopicsRegistry");
    claimTopicsRegistry = await ClaimTopicsRegistry.deploy();
   


    const IdentityRegistryStorage = await ethers.getContractFactory("IdentityRegistryStorage");
    identityRegistryStorage = await IdentityRegistryStorage.deploy();
    await identityRegistryStorage.deployed();

     
    //above three deployed contracts are included in the identity contract

    const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await IdentityRegistry.deploy(trustedIssuersRegistry.address,claimTopicsRegistry.address,identityRegistryStorage.address);
    await identityRegistry.deployed();

    const IdentityHolder = await ethers.getContractFactory("Identity");
     identityHolder1 = await IdentityHolder.deploy(signer1.address,false);
     identityHolder2 = await IdentityHolder.deploy(signer2.address,false);
     


    await identityRegistryStorage.bindIdentityRegistry(identityRegistry.address);
    await identityRegistry.addAgentOnIdentityRegistryContract(agent.address);

    
    const zeroAddress = 0x0000000000000000000000000000000000000000;
  })

  it("add identityHolder to the odentity contract",async()=>{
    //country code for this contract India= 234
    await identityRegistry.connect(agent).registerIdentity(signer1.address,identityHolder1.address,234);
    //this will pass as the signer1 hold the identityHolder contract 
   const identity = await identityRegistry.connect(agent).identity(signer1.address);

   expect(identityHolder1.address).to.equal(identity);

  })

  it("revert if the identity address is zero address",async()=>{

    expect(identityRegistry.connect(agent).registerIdentity(signer1.address,zeroAddress.address,234)).to.be.revertedWith("contract address can\'t be a zero address");

  })

  it("revert when the user has already existing identity contract ",async()=>{
    await identityRegistry.connect(agent).registerIdentity(signer1.address,identityHolder1.address,234);
    expect(identityRegistry.connect(agent).registerIdentity(signer1.address,identityHolder2.address,234)).to.be.revertedWith('identity contract already exists, please use update');

  })
  it("modifying the identity of the user modifyStoredIdentity(address _userAddress, IIdentity _identity),updateIdentity ",async()=>{
    await identityRegistry.connect(agent).registerIdentity(signer1.address,identityHolder1.address,234);
    const identityBefore = await identityRegistry.connect(agent).identity(signer1.address);
    expect(identityHolder1.address).to.equal(identityBefore);
    await identityRegistry.connect(agent).updateIdentity(signer1.address,identityHolder2.address);
    const identityAfter = await identityRegistry.connect(agent).identity(signer1.address);
    expect(identityHolder2.address).to.equal(identityAfter);
  })

  it("revert if there is no existing identity contract to the user",()=>{
    expect(identityRegistry.connect(agent).updateIdentity(signer1.address,identityHolder2.address)).to.be.revertedWith('this user has no identity registered');
  })
  it("revert if the entered identityHolder address is equal to zero",async()=>{
    await identityRegistry.connect(agent).registerIdentity(signer1.address,identityHolder1.address,234);
    expect(identityRegistry.connect(agent).updateIdentity(signer1.address,zeroAddress)).to.be.revertedWith('contract address can\'t be a zero address');
  })
   

  it("modify investor countrd code",async()=>{
    await identityRegistry.connect(agent).registerIdentity(signer1.address,identityHolder1.address,234);
     const investorCountryBefor = await identityRegistry.connect(agent).investorCountry(signer1.address);

     identityRegistry.connect(agent).updateCountry(signer1.address,345);
     const investorCountryAfter = await identityRegistry.connect(agent).investorCountry(signer1.address);
     expect(investorCountryBefor).not.equal(investorCountryAfter);
  })

  it("revert if user dosnt have identity contract while modifying the country code",()=>{
    expect(identityRegistry.connect(agent).updateCountry(signer1.address,333)).to.be.revertedWith('this user has no identity registered');
  })

  it("delete the user identity contract",async()=>{
    const _zeroAddress = 0x0000000000000000000000000000000000000000;
    await identityRegistry.connect(agent).registerIdentity(signer1.address,identityHolder1.address,234);
    
    await identityRegistry.connect(agent).deleteIdentity(signer1.address);
    const userIdentity = await identityRegistry.investorCountry(signer1.address);
    expect(userIdentity).to.equal(0);
    })

  it("to delete user shoild have the identity contract first ",async()=>{
    expect(identityRegistry.connect(agent).deleteIdentity(signer1.address)).to.be.revertedWith('you haven\'t registered an identity yet');
  })

  it("is verified function",async()=>{
    await identityRegistry.connect(agent).registerIdentity(signer1.address,identityHolder1.address,234);

   const check =  await identityRegistry.isVerified(signer1.address);

   expect(check).to.equal(true);
  })

  it("revert if user address is zero address",async ()=>{
    // const _zeroAddress = 0x0000000000000000000000000000000000000000;
    expect(await identityRegistry.isVerified(signer1.address)).to.equal(false);
  })
})
describe("trusted issuer registry",()=>{
  let trustedIssuersRegistry,trusedIssuer1,trusedIssuer2;

  beforeEach(async()=>{
    [owner,signer,signer1,signer2] = await ethers.getSigners();
    const TrustedIssuersRegistry = await ethers.getContractFactory("TrustedIssuersRegistry");
    trustedIssuersRegistry = await TrustedIssuersRegistry.connect(signer).deploy();

    const TrustedIssuer = await ethers.getContractFactory("ClaimIssuer");

    trusedIssuer1 = await TrustedIssuer.deploy(signer1.address);
    trusedIssuer2 = await TrustedIssuer.deploy(signer2.address);
  })

  it("add truested issuer to the truested issuer registry",async()=>{
    await trustedIssuersRegistry.connect(signer).addTrustedIssuer(trusedIssuer1.address,[1,2,3,4]);
  })

  it("the claim topic of the trusted issuer should be equal to zero ie he added for the first time as the trusted issuer",async()=>{
    await trustedIssuersRegistry.connect(signer).addTrustedIssuer(trusedIssuer1.address,[1,2,3,4]);
    expect(trustedIssuersRegistry.connect(signer).addTrustedIssuer(trusedIssuer1.address,[5])).to.be.revertedWith('trusted Issuer already exists');
  })

  it("claim topic should notbe equal to zero",async()=>{
    expect(trustedIssuersRegistry.connect(signer).addTrustedIssuer(trusedIssuer1.address,[])).to.be.revertedWith('trusted claim topics cannot be empty');
  })

  it("remove trusted issuer registry",async()=>{
    await trustedIssuersRegistry.connect(signer).addTrustedIssuer(trusedIssuer1.address,[1,2,3,4]);
    await trustedIssuersRegistry.connect(signer).removeTrustedIssuer(trusedIssuer1.address);
    // expect(await trustedIssuersRegistry.getTrustedIssuerClaimTopics(trusedIssuer1.address)).to.equal(0);
    
  })
  // it("to remove trusted issuer registry",async()=>{
  //   await trustedIssuersRegistry.connect(signer).addTrustedIssuer(trusedIssuer1.address,[1,2,3,4]);
  //   await trustedIssuersRegistry.connect(signer).removeTrustedIssuer(trusedIssuer1.address);
  //   expect(await trustedIssuersRegistry.getTrustedIssuerClaimTopics(trusedIssuer1.address)).to.equal(0);
    
  // })
})