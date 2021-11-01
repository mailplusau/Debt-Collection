/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * 
 * Module Description
 * 
 * @Last Modified by: Anesu Chakaingesu
 * 
 */

define(['N/runtime', 'N/search', 'N/record', 'N/log', 'N/task', 'N/currentRecord', 'N/format', 'N/email'],
    function(runtime, search, record, log, task, currentRecord, format, email) {
        var zee = 0;
        var role = 0;

        role = runtime.getCurrentUser().role;
        var user = runtime.getCurrentUser().user;

        var baseURL = 'https://1048144.app.netsuite.com';
        if (runtime.EnvType == "SANDBOX") {
            baseURL = 'https://system.sandbox.netsuite.com';
        }

        function main() {



            var invResultSet1 = search.load({
                id: 'customsearch_debt_coll_inv_2',
                type: 'invoice'
            });
            invResultSet1.filters.push(search.createFilter({
                name: 'custentity_debt_coll_auth_id',
                join: 'customer',
                operator: search.Operator.EQUALTO,
                values: 691582 // Turkan
            }));
            var count_1 = invResultSet1.runPaged().count;

            log.debug({
                title: 'Count - 1',
                details: count_1
            });

            var invResultSet2 = search.load({
                id: 'customsearch_debt_coll_inv_2',
                type: 'invoice'
            });
            invResultSet2.filters.push(search.createFilter({
                name: 'custentity_debt_coll_auth_id',
                operator: search.Operator.EQUALTO,
                join: 'customer',
                values: 1403209 // Jasmeet
            }));
            var count_2 = invResultSet2.runPaged().count;
            log.debug({
                title: 'Count - 2',
                details: count_2
            });


            var invResultSet3 = search.load({
                id: 'customsearch_debt_coll_inv_2',
                type: 'invoice'
            });
            invResultSet3.filters.push(search.createFilter({
                name: 'custentity_debt_coll_auth_id',
                operator: search.Operator.EQUALTO,
                join: 'customer',
                values: 755585 // Yassine
            }));
            var count_3 = invResultSet3.runPaged().count;
            log.debug({
                title: 'Count - 3',
                details: count_3
            });

            var body = '<h1 style="padding:40px;text-align:left;font-family:sans-serif;font-size:15px;mso-height-rule:exactly;line-height:20px;color:#555555;"><br>Dear Ankith,<br><br>Count of Turkans List:' + count_1 + '<br>Count of Yassines List:' + count_3 + '<br>Count of Jasmeets List: ' + count_2 + '<br>';

            body += '<br><br><a href="https://1048144.app.netsuite.com/app/common/search/search.nl?cu=T&e=T&id=3659">Debt Collection Search</a>'

            body += '</h1>';

            var subject = 'Debt Collection: Number of Customers Per Assigned Role';
            var recipients = ['ankith.ravindran@mailplus.com.au']; //, ''
            var cc = ['anesu.chakaingesu@mailplus.com.au'];

            var email_ticket = email.send({
                author: 924435,
                body: body,
                recipients: recipients,
                subject: subject,
                cc: cc
            });
            log.debug({
                title: 'Email Sent Out',
                details: email_ticket
            })
        }

        return {
            execute: main
        }
    }
);