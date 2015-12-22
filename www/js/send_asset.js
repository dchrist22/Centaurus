console.log('start');

var server = new StellarSdk.Server({
  hostname: 'https://horizon-testnet.stellar.org',
  secure: true,
  port: 443
});

//var kp_master = StellarSdk.Keypair.master();
//var master_public = kp_master.address();

var source_private = 'SAVIM765NWP4O7NDWXMKTEF4ABDPNH3ZAQGSHDKS6GQL2R5NVZPUGYM4';
var source_public  = 'GDFRAHLTQIJOPIOFRUOH2TXLNN6ZDBPHNBM2UDCHJKJ5IHAGFS66NSHQ';

var dest_private   = 'SCA3GY3HDRDJRMTWWLEH5NW265TZBNFPF6OUEKZVVDKQQRFQ2LE5EAU2';
var dest_public    = 'GB2X236LSXKGX4AUXQRR56AGSSFZUW7ZVH47EG6WYYDDB5Y4LFFCSQYO'; 
//var usd_Asset = new StellarSdk.Asset('USD', 'GBBM6BKZPEHWYO3E3YKREDPQXMS4VK35YLNU7NFBRI26RAN7GI5POFBB');



console.log('end');
