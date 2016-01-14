angular.module('starter.controllers.send', [])
.controller('SendCtrl', function ($scope, $ionicActionSheet, $ionicPopover, UIHelper, Account, Remote, Settings, QR, Commands) {
    var account = Account.get();
    $scope.$on('accountInfoLoaded', function (event) {
        account = Account.get();
        $scope.available = account.balance - account.reserve;
        $scope.account = account;
        $scope.sourceInfo = {
            acceptedCurrencies : ['XLM'],
            acceptedIOUs : []
        };
        for (i = 0; i < $scope.account.otherCurrencies.length; i++) {
            $scope.sourceInfo.acceptedCurrencies.push(
                $scope.account.otherCurrencies[i].currency
            )
            $scope.sourceInfo.acceptedIOUs.push({
                currency: $scope.account.otherCurrencies[i].currency,
                issuer:   $scope.account.otherCurrencies[i].issuer
            })
        }
        $scope.$apply();
    });

    $scope.available = account.balance - account.reserve;
    $scope.account = account;
    $scope.showDestinationTag = false;
    $scope.paymentData = {
        destinationAddress : '',
        destinationTag : null,
        source_amount : null,
        source_currency : 'XLM',
        dest_amount : null,
        dest_currency : 'XLM'
    };
    $scope.destinationInfo = {
        isValidAddress: false,
        needFunding : false,
        acceptedCurrencies : ['XLM'],
        acceptedIOUs : []
    };
    $scope.transactionContext = {
        isDirty : false,
        isValidCurrency : false,
        alternatives : [],
        path : [],
        source_amount : 0,
        dest_amount : 0
    };
    $scope.popoverSourceItemCount = 2;
    $scope.popoverDestItemCount = 2;
    
    var alternativesFilter = function(msg){
        return (msg.type === 'find_path' && msg.alternatives);
    };
    var alternativesCallback = function(msg){
        $scope.transactionContext.alternatives = msg.alternatives;
        $scope.$apply();
    };
    Remote.addMessageHandler(alternativesFilter, alternativesCallback);

    $ionicPopover.fromTemplateUrl('templates/selectSourceCurrency.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.sourceCurrencyPopover = popover;
    });

    $scope.$on('$destroy', function() {
        $scope.sourceCurrencyPopover.remove();
    });

     $ionicPopover.fromTemplateUrl('templates/selectDestCurrency.html', {
        scope: $scope
    }).then(function(popover) {
        $scope.destCurrencyPopover = popover;
    });

    $scope.$on('$destroy', function() {
        $scope.destCurrencyPopover.remove();
    });
    
    $scope.$watch('transactionContext.isDirty', function(isDirty) {
        if(!isDirty)
            return;
        try{
        var context = $scope.transactionContext;
        if(context.currentAlternativeStream)
        {
            context.currentAlternativeStream.subcommand = "close";
            //Remote.send(context.currentAlternativeStream);  
            context.currentAlternativeStream = null;
        }
        context.source_amount = $scope.paymentData.source_amount;
        context.dest_amount = $scope.paymentData.dest_amount;
        context.alternatives = [];
        var isCompletePaymentInfo = $scope.destinationInfo.isValidAddress
            && context.isValidCurrency            
            && context.source_amount > 0
            && context.dest_amount > 0
            && ($scope.paymentData.source_currency == 'XLM' || $scope.destinationInfo.acceptedIOUs.length > 0);
        
        if(isCompletePaymentInfo)
        {
            var asset;            
            if($scope.paymentData.dest_currency == 'XLM') {
                asset = StellarSdk.Asset.native();
            }
            else {
                var issuer = '';
                for(i=0; i<$scope.destinationInfo.acceptedIOUs.length; i++)
                {
                    var iou = $scope.destinationInfo.acceptedIOUs[i];
                    if(iou.currency === $scope.paymentData.dest_currency){
                        issuer = iou.issuer;
                        break;
                    }                    
                }
                asset = new StellarSdk.Asset($scope.paymentData.dest_currency, issuer);
            }

            var keys = Settings.getKeys();
            Remote.getServer().paths(keys.address, $scope.paymentData.destinationAddress, asset, context.dest_amount)
                .call()
                .then(function (response) {
                    context.alternatives = response.records;
                    console.log(JSON.stringify(response));
                })
            .catch(function (err) {
                console.log(err);
            });
        }
        } catch (err) {
            console.log(err);
        };
        context.isDirty = false;
    });
    
    $scope.$watch('paymentData.destinationAddress', function(newAddress) {
        $scope.destinationInfo.acceptedCurrencies = ['XLM'];
        $scope.destinationInfo.acceptedIOUs = [];
        var isValidAddress = StellarSdk.Account.isValidAddress(newAddress);
        if(isValidAddress)
        {
            Remote.getServer().accounts()
            .address(newAddress)
            .call()
            .then(function (acc) {
                $scope.destinationInfo.needFunding = false;
                for (i = 0; i < acc.balances.length; i++) {
                    var bal = acc.balances[i];
                    if (!bal.asset_code)
                        continue;
                    if (bal.limit <= 0)
                        continue;
                    var isNewCurrency = $scope.destinationInfo.acceptedCurrencies.indexOf(bal.asset_code) == -1;
                    if (isNewCurrency)
                        $scope.destinationInfo.acceptedCurrencies.push(bal.asset_code);
                    var iou = {
                        currency: bal.asset_code,
                        issuer: bal.asset_issuer
                    };
                    $scope.destinationInfo.acceptedIOUs.push(iou);
                }
                $scope.transactionContext.isDirty = true;
                $scope.popoverSourceItemCount = Math.min($scope.sourceInfo.acceptedCurrencies.length, 5);
                $scope.popoverDestItemCount = Math.min($scope.destinationInfo.acceptedCurrencies.length, 5);
                $scope.$apply();
            })
            .catch(StellarSdk.NotFoundError, function (err) {
                $scope.destinationInfo.needFunding = true;
            });
        }
        $scope.destinationInfo.isValidAddress = isValidAddress;
        //        if($scope.destinationInfo.acceptedCurrencies.indexOf($scope.paymentData.currency) < 0)
        //        {
        //            $scope.paymentData.currency = 'STR';
        //            $scope.paymentData.amount = 0;
        //        }
        $scope.transactionContext.isDirty = true;
    });
    
    //$scope.$on('paymentSuccessful', function (event) {
    //    $scope.paymentData.amount = 0;
    //});

    $scope.$watch('paymentData.source_currency', function(newCurrency) {
        if(newCurrency.toUpperCase() != $scope.paymentData.source_currency)
            $scope.paymentData.source_currency = newCurrency.toUpperCase();
        else {
            $scope.transactionContext.isValidCurrency = newCurrency.length > 1; // TODO: more suffisticated validation
            $scope.transactionContext.isDirty = true;
        }
    });

    $scope.$watch('paymentData.source_amount', function(newAmount) {
        $scope.transactionContext.isDirty = true;
    });
    $scope.$watch('paymentData.dest_currency', function(newCurrency) {
        if(newCurrency.toUpperCase() != $scope.paymentData.dest_currency)
            $scope.paymentData.dest_currency = newCurrency.toUpperCase();
        else {
            $scope.transactionContext.isValidCurrency = newCurrency.length > 1; // TODO: more suffisticated validation
            $scope.transactionContext.isDirty = true;
        }
    });

    $scope.$watch('paymentData.dest_amount', function(newAmount) {
        $scope.transactionContext.isDirty = true;
    });

    $scope.translationBuffer = {
        translations: [],
        get: function (index) {
            if(index < this.translations.length)
                return this.translations[index];
            return null;
        }
    };
    UIHelper.translate(
        [ 'controllers.send.validate.address.invalid'
        , 'controllers.send.validate.currency.invalid'
        , 'controllers.send.options.title'
        ]).then(function (t) {
            $scope.translationBuffer.translations = t;
        });

    $scope.sendPayment = function () {
        var context = $scope.transactionContext;
        var keys = Settings.getKeys();

        var operationBuilder = function () {
            var operation = null;
            if ($scope.destinationInfo.needFunding) {
                operation = StellarSdk.Operation.createAccount({
                    destination: $scope.paymentData.destinationAddress,
                    startingBalance: context.dest_amount.toString()
                });
            }
            else {
                var source_asset = '';
                var dest_asset   = '';

                if ($scope.paymentData.source_currency != 'XLM') {

                    for(i=0; i<$scope.sourceInfo.acceptedIOUs.length; i++)
                    {
                        var iou = $scope.sourceInfo.acceptedIOUs[i];
                        if(iou.currency === $scope.paymentData.source_currency){
                            source_issuer = iou.issuer;
                            break;
                        }
                    }

                    for(i=0; i<$scope.destinationInfo.acceptedIOUs.length; i++)
                    {
                        var iou = $scope.destinationInfo.acceptedIOUs[i];
                        if(iou.currency === $scope.paymentData.dest_currency){
                            dest_issuer = iou.issuer;
                            break;
                        }
                    }

                    source_asset = new StellarSdk.Asset($scope.paymentData.source_currency, source_issuer);
                    dest_asset = new StellarSdk.Asset($scope.paymentData.dest_currency, dest_issuer);
                }
                else {
                    source_asset = StellarSdk.Asset.native();
                    dest_asset   = StellarSdk.Asset.native();
                }
                
                console.log("Send info:");
                console.log("----------");
                console.log("sendAsset: "   + source_asset.toString());
                console.log("sendMax: "     + context.source_amount.toString());
                console.log("destination: " + $scope.paymentData.destinationAddress);
                console.log("destAsset: "   + dest_asset);
                console.log("destAmount: "  + context.dest_amount.toString());
                console.log("path: "        + context.path);
                console.log("----------");
                
                operation = StellarSdk.Operation.pathPayment({
                    sendAsset: source_asset,
                    sendMax: context.source_amount.toString(),
                    destination: $scope.paymentData.destinationAddress,
                    destAsset: dest_asset,
                    destAmount: context.dest_amount.toString(),
                    path: context.path
                });

                //else {
                //    operation = StellarSdk.Operation.payment({
                //        destination: $scope.paymentData.destinationAddress,
                //        asset: StellarSdk.Asset.native(),
                //        amount: context.source_amount.toString()
                //    });
            }
            return operation;
        }

        var actualSendAction = function () {
            try{
            UIHelper.blockScreen('controllers.send.pending', 20);
            var memo;
            // do this check, in case user pastes into input field or something
            // not handled by the maxlenstr directive
            if ($scope.paymentData.destinationTag) {
                var destMemo = $scope.paymentData.destinationTag;
                if (destMemo.length > 28) {
                    destMemo = destMemo.substr(0, 28);
                }
     
                memo = StellarSdk.Memo.text(destMemo);
            }
                
            var operation = operationBuilder();
            var transaction = Account.buildTransaction(operation, memo, true);
            Remote.getServer().submitTransaction(transaction)
            .then(function (transactionResult) {
                console.log(transactionResult);
                $scope.paymentData.source_amount = 0;
                $scope.paymentData.dest_amount = 0;
                UIHelper.blockScreen('controllers.send.success', 2);
            })
            .catch(function (err) {
                if (err.type === 'https://stellar.org/horizon-errors/transaction_failed') {
                    var errorCode = err.extras && err.extras.result_codes ? err.extras.result_codes.transaction : null;
                    if (errorCode === "tx_bad_seq") {
                        Account.reload();
                        UIHelper.showAlert('controllers.send.outOfSync');
                    }
                    else
                        UIHelper.showAlert('controllers.send.failed ', ' ' + errorCode);
                }
                else {
                    var msg = err.title;
                    if (err.extras && err.extras.result_codes)
                        msg += ': ' + err.extras.result_codes.transaction;
                    if(msg)
                        UIHelper.showAlert(msg);
                    else
                        UIHelper.showAlert('controllers.send.failed.unknown');
                }
            });
        } catch (err) {
            if (err.message)
                UIHelper.showAlert(err.message);
            else
                UIHelper.showAlert(JSON.stringify(err));
            }
        }

        var t = $scope.translationBuffer;
        if($scope.paymentData.destinationAddress.length == 0)
            UIHelper.showAlert('controllers.send.validate.address.empty');
        else if(!$scope.destinationInfo.isValidAddress)
            UIHelper.showAlert('"' + $scope.paymentData.destinationAddress + '" ' + t.get(0));
        else if($scope.paymentData.source_amount < 0)
            UIHelper.showAlert('controllers.send.validate.amount.negative');
        else if($scope.paymentData.source_amount == 0 || $scope.paymentData.source_amount == null)
            UIHelper.showAlert('controllers.send.validate.amount.zero');
        else if(!context.isValidCurrency)
            UIHelper.showAlert('"' + $scope.paymentData.source_currency + '" ' + t.get(1));
        else if($scope.paymentData.source_currency == 'XLM' && $scope.paymentData.source_amount > account.balance)
            UIHelper.showAlert('controllers.send.validate.amount.funds');
        else if (context.source_amount == null)
            UIHelper.showAlert('controllers.send.validate.general');
        else if (context.alternatives.length > 1) {
            var sheet = {
                buttons: [],
                titleText: t.get(2),
                buttonClicked: function (index) {
                    var choice = context.alternatives[index];
                    console.log("choice:");
                    console.log("----------");
                    console.log(choice);
                    console.log("----------");
                    //Computing paths
                    for (i = 0; i < choice.path.length; i++) {
                        context.path[i] = new StellarSdk.Asset(choice.path[i].asset_code, choice.path[i].asset_issuer);
                        console.log("Assets:");
                        console.log("----------");
                        console.log(context.path[i]);
                        console.log("----------");
                    }
                    /*UIHelper.showAlert(choice);
                    if(choice.paths_computed && choice.paths_computed.length > 0)
                    {
                    }*/
                    actualSendAction();
                    return true;
                }
            };
            for (i = 0; i < context.alternatives.length; i++) {
                var alternative = context.alternatives[i];
                var amount = alternative.source_amount;
                var currency = alternative.source_asset_code;
                if (!currency)
                    currency = 'XLM';
                var button = { text: amount + ' ' + currency };
                sheet.buttons.push(button);
            }
            $ionicActionSheet.show(sheet);
        }
        else 
            actualSendAction();   
    };
	
    $scope.scanCode = function () {
	
        // var text = 'centaurus:backup001eyJhZGRyZXNzIjoiZ0VQTGJvUWpvdXdkUkJvVnppOHZ3TGQyU1dqWmEzeGNUTCIsInNlY3JldCI6InNmbUIzNEFNdUFQcmdiZ2VGSjdpWHhpMTROYUt4UWZjWG9FZXgzcDRUcWVrQWd2aW5oYSIsIm1vZGUiOiJsb2FkZWQifQ==';
        // // var text = 'centaurus:backup001eyJhZGRyZXNzIjoiZzN2Ynl1azJyYnZMTkVkRGVrY3JFaE1xUWl4bVExUThWeiIsInNlY3JldCI6InNmRXBtMzlwdEJjWFc4c21zUnlCRnZKaWVXVGQ0WG05MUc4bkh0cGVrV2Z3UnpvZTFUUCIsIm1vZGUiOiJsb2FkZWQifQ==';
        // var cmd = Commands.parse(text);					
        // if(cmd.isCommand){
        // Commands.execute(cmd.rawCommand);
        // }
        QR.scan(
			function (result) {
			    if (!result.cancelled) {
			        var cmd = Commands.parse(result.text);					
			        if(cmd.isCommand) {
			            Commands.execute(cmd.rawCommand);
			        }
			        else {
			            $scope.paymentData.destinationAddress = result.text;
			        }
			        $scope.$apply();					
			    }
			},
			function (error) {
			    UIHelper.showAlert('controllers.send.scan.failed', ' ' + error);
			}
		);
    };

    $scope.donate = function () {
        $scope.paymentData = {
            //destinationAddress: 'GC7DJUFVMD5BYXS67MWAAQSJF6UASF47RY2AUCKOR5J2YTWS6ZNIGS6Y',
            destinationAddress: 'GDJXQYEWDPGYK4LGCLFEV6HBIW3M22IK6NN2WQONHP3ELH6HINIKBVY7',
            amount: Math.floor(0.01 * account.balance),
            currency: 'XLM'
        }
    };
})

