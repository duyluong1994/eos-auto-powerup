const { Api, JsonRpc } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');  // development only
const fetch = require('node-fetch'); //node only
const { TextDecoder, TextEncoder } = require('util'); //node only
const moment = require("moment");
const { PowerUpState, Resources } = require('@greymass/eosio-resources')


const privateKeys = [''];
const EOSNodeURL = ''


const signatureProvider = new JsSignatureProvider(privateKeys);
const rpc = new JsonRpc(EOSNodeURL, { fetch }); //required to read blockchain state
const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() }); //required to submit transactions


const resources_eos = new Resources({
    url: EOSNodeURL,
    fetch,
})


monAccounts = ['mykeypostman', 'trust.game'];
payAccount = 'trust.game';

powerUpLimit = 0.90
powerUpPerRound = 0.01  // 1% of max
maxPayEOS = "1.0000 EOS"


global.sleep = async (timeout) => {
    return new Promise((res, rej) =>
        setTimeout(() => {
            return res();
        }, timeout)
    );
};


(async () => {


    while (true) {

        for (let index = 0; index < monAccounts.length; index++) {
            const acc = monAccounts[index];

            console.log(`\n[${moment().format("YYYY-MM-DD HH:mm:ss")}]`, acc);


            let ret = await rpc.get_account(acc)
            let cpu_limit = ret.cpu_limit;
            let net_limit = ret.net_limit;


            cpuUsage = cpu_limit.used / cpu_limit.max
            netUsage = net_limit.used / net_limit.max

            console.log("cpu", cpu_limit, cpuUsage)
            console.log("net", net_limit, netUsage)

            cpuToPowerUp = 0
            netToPowerUp = 0

            if (cpuUsage > powerUpLimit) {
                console.log("cpuUsage is above powerUpLimit ", cpuUsage, powerUpLimit)
                cpuToPowerUp = cpu_limit.max * powerUpPerRound  // to ms
            }

            if (netUsage > powerUpLimit) {
                console.log("netUsage is above powerUpLimit ", netUsage, powerUpLimit)
                netToPowerUp = net_limit.max * powerUpPerRound
            }

            if (cpuToPowerUp > 0 || netToPowerUp > 0) {
                console.log("to powerup", cpuToPowerUp, netToPowerUp)


                const powerup = await resources_eos.v1.powerup.get_state()
                const sample = await resources_eos.getSampledUsage()

                // console.log(powerup.cpu)

                const cpuFrac = powerup.cpu.frac(sample, cpuToPowerUp)
                const netFrac = powerup.net.frac(sample, netToPowerUp)

                console.log("cpuFrac", cpuFrac, "netFrac", netFrac)

                // sent tx

                const result = await api.transact({
                    actions: [{
                        account: "eosio",
                        name: "powerup",
                        data: {
                            payer: payAccount,
                            receiver: acc,
                            days: 1,
                            cpu_frac: cpuFrac,
                            net_frac: netFrac,
                            max_payment: maxPayEOS
                        },
                        authorization: [
                            {
                                actor: payAccount,
                                permission: "active"
                            }
                        ]
                    }]
                }, {
                    blocksBehind: 3,
                    expireSeconds: 30,
                });
                console.dir(result);
            }

            await sleep(2000);

        }



        // await sleep(2000);
    }



})();
