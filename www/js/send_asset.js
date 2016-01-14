console.log('start');

var server = new StellarSdk.Server({
    hostname: 'horizon-testnet.stellar.org',
    secure: true,
    port: 443
});

var source_private  = 'SDLPV25EHC5GZHBK6Q375SJNJ7FSNKSNDYVDNIHNEXYJKVKO7NKOCHJP';
var source_public   = 'GDK7DNFZ6FYAQONWZS6IYNQRLLJWDE6YO3AIUG737OI64A6Q6B6OORSG';

var dest1_private   = 'SBPC6X5V4ZLTQGB677NZ3UH6RBIY5P7DZXX4JFF4KJMYLVPWSPO4ALNI';
var dest1_public    = 'GBG7BVVMU5WAEUI6PKTDAQJSVR7FRGOH6E7LPM7QV7K7QC2EHSUSSVE4'; 

var dest2_private   = 'SBTZYHOLT6CP7JAEWLCDT6KZEYQCD55SXPTF6XWNEXE6NTNK7ODQLOOJ';
var dest2_public    = 'GBBZLTPPW5BERNCZYBPKFD74KV64M7VGAS7DWNPK75PLFOWOFXM2TZQS';

var issuer1_private = 'SDHO4IN6X7MHJNMFCHFW2FY2KHWPQ2RCSANPN5KXSGJTJK5UEX7RO2DO';
var issuer1_public  = 'GA2J3BILCA6OV2FPARK7LCDN22L6KUVGJVCESHJLXC6VGRZASCOODBFK';

var issuer2_private = 'SCFIAOUQCUIMOGG7LUUQTIK6QQEMQP2Q23MQN2KEG7BV3VEE5L5EFYH6';
var issuer2_public  = 'GAHY2RGQEV5FGPNAT3PUWENQXZU3NAPPWFZ23HHMLRFT453IJEGMGBPA';

var source_keypair  = StellarSdk.Keypair.fromSeed(source_private);
var dest1_keypair   = StellarSdk.Keypair.fromSeed(dest1_private);
var dest2_keypair   = StellarSdk.Keypair.fromSeed(dest2_private);
var issuer1_keypair = StellarSdk.Keypair.fromSeed(issuer1_private);
var issuer2_keypair = StellarSdk.Keypair.fromSeed(issuer2_private);

var usd_asset = new StellarSdk.Asset('USD', issuer1_public);
var eur_asset = new StellarSdk.Asset('EUR', issuer2_public);
var xlm_asset = new StellarSdk.Asset.native();


function send_transaction(account_public, account_keypair, operation) {
    server.loadAccount(account_public)
    .then(function(account) {
	var transaction = new StellarSdk.StellarBase.TransactionBuilder(account)
	    .addOperation(operation).build();

	// Sign this transaction with the secret key
	transaction.sign(account_keypair)
	
	// Let's see the XDR (encoded in base64) of the transaction we just built
	console.log(transaction.toEnvelope().toXDR('base64'))
	
	// Submit the transaction to the Horizon server. The Horizon server will then
	// submit the transaction into the network for us.
	server.submitTransaction(transaction)
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
};


var changeOffers = !true; var deleteOffers = !true;
var showOffers = !true;
var paths = true;
var send = !true;

if (changeOffers) { 

    if (deleteOffers) {

       send_transaction(dest1_public, dest1_keypair,
                         StellarSdk.StellarBase.Operation.manageOffer({
                             selling: eur_asset,		
                             buying:  usd_asset,		
                             amount:  "0",		
                             price:   1,
                             offerId: 170
                         })
                        );

       /*
        send_transaction(dest1_public, dest1_keypair,
                         StellarSdk.StellarBase.Operation.manageOffer({
                             selling: usd_asset,		
                             buying:  xlm_asset,		
                             amount:  "0",		
                             price:   1,
                             offerId: 171
                         })
                        );
        */
    } else {
/*        send_transaction(dest1_public, dest1_keypair,
                         StellarSdk.StellarBase.Operation.manageOffer({
                             selling: usd_asset,		
                             buying:  xlm_asset,		
                             amount:  "100",		
                             price:   1
                         })
                        );*/

        send_transaction(dest1_public, dest1_keypair,
                         StellarSdk.StellarBase.Operation.manageOffer({
                             selling: eur_asset,		
                             buying:  usd_asset,		
                             amount:  "100",		
                             price:   1                    
                         })
                        );
    }
}
if (showOffers) {
    server.orderbook(xlm_asset, usd_asset).call()
        .then(function (response) {
            console.log(JSON.stringify(response));
        })
        .catch(function (err) {
            console.log(err);
        });

    server.orderbook(eur_asset, usd_asset).call()
        .then(function (response) {
            console.log(JSON.stringify(response));
        })
        .catch(function (err) {
            console.log(err);
        });
}

var path = [];
var path_ready = false;

if (paths) {
    //getting paths
    server.paths(source_public, dest2_public, eur_asset, "1").call()
        .then(function (response) {
            console.log(JSON.stringify(response));
            for (var i = 0; i < response.records.length; i++) {
                console.log("record " + i + ":");
                console.log(response.records[i])
                for (var j = 0; j < response.records[i].path.length; j++) {
                    console.log(response.records[i].path[j]);
                }
            }

            var record_n = 1;
            
            for (var i = 0; i < response.records[record_n].path.length; i++) {
                path[i] = new StellarSdk.Asset(response.records[record_n].path[i].asset_code, response.records[record_n].path[i].asset_issuer);
            }
            path_ready = true;    
        })
        .catch(function (err) {
            console.log(err);
        });
}

if (send) {

    console.log("wait");    
    function x() {
        console.log("chosen path: ");
        console.log(path);
        
        //Path payment
        send_transaction(source_public, source_keypair,
                         StellarSdk.Operation.pathPayment({
                             sendAsset: xlm_asset,
                             sendMax: "5",
                             destination: dest2_public,
                             destAsset: eur_asset,
                             destAmount: "1",
                             path: path
                         })
                        );
    }
    setTimeout(x, 3000);
}

console.log('end');
