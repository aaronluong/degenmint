const {ethers} = require('ethers')
const axios = require('axios');
require('dotenv').config()
const { async } = require('q');
const { FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle')
const privatekeys = JSON.parse(process.env.PRIVATE_KEYS)
const Provider = new ethers.providers.AlchemyProvider("mainnet", "mH36sKIVZXbc7O1etTIlstyWgl_pVShq")
// Standard json rpc provider directly from ethers.js. For example you can use Infura, Alchemy, or your own node.

const authSigner = new ethers.Wallet(privatekeys[0], Provider) 
// `authSigner` is an Ethereum private key that does NOT store funds and is NOT your bot's primary key.
// This is an identifying key for signing payloads to establish reputation and whitelisting

//LOOK HERE

const address = "0x7D4B1dA30d1282b59FeD50c4E2F53E82c4B29374" // just paste address in, make sure quotes still there
const rawprice = "0" // price in eth
const input1 = null //probably qty
const input2 = null //put value as necessary, null otherwise
const functionname = "mintRandom"
const maxprio = 5 // max priority fee in gwei
const maxfee = 150 // max fee in gwei

// LOOK HERE

async function main() {
    const flashbotsProvider = await FlashbotsBundleProvider.create(Provider, authSigner)
    // Flashbots provider requires passing in a standard provider and an auth signer
    
    
    var sourceresult = { ABI: "" }
    await axios.get(`https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=` + process.env.ETHERSCAN_KEY).then((res) => {
        sourceresult = res["data"]["result"][0]
    });
    const ABI = sourceresult["ABI"]
    let contract = new ethers.Contract(address,ABI,Provider)
    let price = String(ethers.utils.parseUnits(rawprice,"wei"));
    let bundle = []
    let bundle2 = []
    for (let i = 0; i < privatekeys.length; ++i){
        let wallet = new ethers.Wallet(privatekeys[i],Provider)
        let transaction = null
        if (input2 !== null){
            transaction = await contract.populateTransaction[functionname](input1,input2,{value: price, type:2, nonce: await wallet.getTransactionCount(),gasLimit: 200000})
            transaction.chainId = 1;
            transaction.maxFeePerGas = ethers.BigNumber.from(maxfee).mul(1e9)
            transaction.maxPriorityFeePerGas = ethers.BigNumber.from(maxprio).mul(1e9)
        }
        else if (input1 !== null){
            transaction = await contract.populateTransaction[functionname](input1,{value: price, type:2, nonce: await wallet.getTransactionCount(),gasLimit: 200000})
            transaction.chainId = 1;
            transaction.maxFeePerGas = ethers.BigNumber.from(maxfee).mul(1e9)
            transaction.maxPriorityFeePerGas = ethers.BigNumber.from(maxprio).mul(1e9)
        }
        else{
            transaction = await contract.populateTransaction[functionname]({value: price, type:2, nonce: await wallet.getTransactionCount(),gasLimit: 200000})
            transaction.chainId = 1;
            transaction.maxFeePerGas = ethers.BigNumber.from(maxfee).mul(1e9)
            transaction.maxPriorityFeePerGas = ethers.BigNumber.from(maxprio).mul(1e9)
        }
        bundle.push({transaction: transaction, signer: wallet})
    }
    

    let currentblock = await Provider.getBlockNumber();
    for (let blockoffset = 1; blockoffset < 6; ++blockoffset ){
        const targetBlockNumber = currentblock + blockoffset
        const bundleReceipt = await flashbotsProvider.sendBundle(
            bundle, // bundle we signed above
            targetBlockNumber // block number at which this bundle is valid
        )
        console.log(await bundleReceipt.simulate())
       
    }
    

    
    
}

main()