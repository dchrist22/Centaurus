console.log('start');

var server = new StellarSdk.Server({
    hostname: 'horizon-testnet.stellar.org',
    secure: true,
    port: 443
});

var source_private = 'SAVIM765NWP4O7NDWXMKTEF4ABDPNH3ZAQGSHDKS6GQL2R5NVZPUGYM4';
var source_public  = 'GDFRAHLTQIJOPIOFRUOH2TXLNN6ZDBPHNBM2UDCHJKJ5IHAGFS66NSHQ';

var dest_private   = 'SCA3GY3HDRDJRMTWWLEH5NW265TZBNFPF6OUEKZVVDKQQRFQ2LE5EAU2';
var dest_public    = 'GB2X236LSXKGX4AUXQRR56AGSSFZUW7ZVH47EG6WYYDDB5Y4LFFCSQYO'; 


var sourceKeypair = StellarSdk.Keypair.fromSeed(source_private);
var destKeypair   = StellarSdk.Keypair.fromSeed(dest_private);

var usd_Asset = new StellarSdk.Asset('USD', source_public);


server.loadAccount(dest_public)
    .then(function(dest_account) {
	var dest_change_trust = new StellarSdk.StellarBase.TransactionBuilder(dest_account)
	    .addOperation(StellarSdk.StellarBase.Operation.changeTrust({
		asset: usd_Asset
	    })).build();

	// Sign this transaction with the secret key
	dest_change_trust.sign(destKeypair)
	
	// Let's see the XDR (encoded in base64) of the transaction we just built
	console.log(dest_change_trust.toEnvelope().toXDR('base64'))
	
	// Submit the transaction to the Horizon server. The Horizon server will then
	// submit the transaction into the network for us.
	server.submitTransaction(dest_change_trust)
	    .then(function(transactionResult) {
		console.log('Success!')
		console.log(transactionResult);
	    })
	    .catch(function (err){
		console.log('error')
		console.log(err);
	    });
    }
	 )

console.log('end');
