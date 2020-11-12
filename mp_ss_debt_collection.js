/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * 
 * Module Description
 * 
 * NSVersion    Date                        Author         
 * 2.00         2020-10-22 09:33:08         Anesu
 *
 * Description: Automation of Debt Collection Process   
 * 
 * @Last Modified by:   Anesu
 * @Last Modified time: 2020-10-22 16:49:26
 * 
 */

define(['N/runtime', 'N/search', 'N/record', 'N/log', 'N/task'],
    function(runtime, search, record, log, task) {
        var zee = 0;
        var role = 0;

        var baseURL = 'https://1048144.app.netsuite.com';
        if (runtime.EnvType == "SANDBOX") {
            baseURL = 'https://system.sandbox.netsuite.com';
        }

        role = runtime.getCurrentUser().role;

        if (role == 1000) {
            zee = runtime.getCurrentUser().id;
        } else if (role == 3) { //Administrator
            zee = 6; //test
        } else if (role == 1032) { // System Support
            zee = 425904; //test-AR
        }

        var indexInCallback = 0;
        var ctx = runtime.getCurrentScript();

        function debtCollection() {
            // var date_from = ctx.getSetting('SCRIPT', 'custscript_debt_inv_date_from');
            var date_from = parseInt(ctx.getParameter({ name: 'custscript_debt_inv_date_from' }));
            if (isNullorEmpty(date_from) || isNaN(date_to)) {
                date_from = '1/10/2020';
            }
            // var date_to = ctx.getSetting('SCRIPT', 'custscript_debt_inv_date_to');
            var date_to = parseInt(ctx.getParameter({ name: 'custscript_debt_inv_date_to' }));
            if (isNullorEmpty(date_to) || isNaN(date_to)) {
                date_to = '31/10/2020';
            }
            // var script_main_index = parseInt(ctx.getSetting('SCRIPT', 'custscript_main_index'));
            var script_main_index = parseInt(ctx.getParameter({ name: 'custscript_main_index' }));
            if (!isNaN(script_main_index)) {
                var main_index = script_main_index;
            } else {
                var main_index = 0;
            }

            // var range_id = ctx.getSetting('SCRIPT', 'custscript_debt_inv_range');
            var range_id = parseInt(ctx.getParameter({ name: 'custscript_debt_inv_range' }));
            if (isNullorEmpty(range_id)) {
                range_id = 0;
            }
            var invoice_id_set = JSON.parse(ctx.getParameter({ name: 'custscript_debt_inv_invoice_id_set' }));
            if (isNullorEmpty(invoice_id_set)) {
                invoice_id_set = JSON.parse(JSON.stringify([]));
            }
            var debt_set = JSON.parse(ctx.getParameter({ name: 'custscript_debt_inv_debt_set' }));
            if (isNullorEmpty(debt_set)) {
                debt_set = JSON.parse(JSON.stringify([]));
            }

            log.debug({
                title: 'main_index',
                details: main_index
            });
            log.debug({
                title: 'date_from',
                details: date_from
            });
            log.debug({
                title: 'date_to',
                details: date_to
            });

            var invResultSet = invoiceSearch(range_id, date_from, date_to);
            // var resultsSet = invResultSet.getResults(main_index, main_index + 1000);

            if (main_index < 4000) {
                invResultSet.each(function(invoiceSet, index) {
                    indexInCallback = index;
                    var usageLimit = ctx.getRemainingUsage();

                    if (usageLimit < 200 || index == 999) {
                        params = {
                            custscript_main_index: main_index + index,
                            custscript_debt_inv_range: range_id,
                            custscript_debt_inv_date_from: date_from,
                            custscript_debt_inv_date_to: date_to,
                            custscript_debt_inv_debt_set: JSON.stringify(debt_set),
                            custscript_debt_inv_invoice_id_set: JSON.stringify(invoice_id_set)
                        };

                        reschedule = task.create({
                            taskType: task.TaskType.SCHEDULED_SCRIPT,
                            scriptId: ctx.scriptId,
                            deploymentId: ctx.deploymentId,
                            params: params
                        });
                        // nlapiLogExecution('DEBUG', 'Attempting: Rescheduling Script', reschedule);
                        log.debug({
                            title: 'Attempting: Rescheduling Script',
                            details: reschedule
                        });
                        if (reschedule == false) {
                            // nlapiLogExecution('DEBUG', 'Rescheduling Completed', reschedule);
                            log.debug({
                                title: 'Rescheduling Completed',
                                details: reschedule
                            });
                            return false;
                        }
                    } else {
                        var invoice_id = invoiceSet.getValue({
                            name: 'internalid'
                        });
                        if (invoice_id_set.indexOf(invoice_id) == -1) {
                            invoice_id_set.push(invoice_id);
                            log.debug({
                                title: 'invoiceSet',
                                details: invoiceSet
                            });

                            var customer_id = invoiceSet.getValue({
                                name: 'internalid',
                                join: 'customer'
                            });

                            var customer_name = invoiceSet.getValue({
                                name: 'companyname',
                                join: "customer"
                            });

                            var zee_name = invoiceSet.getValue({
                                name: 'partner'
                            });

                            var total_num = '1';

                            var total_amount = parseFloat(invoiceSet.getValue({
                                name: 'amount'
                            }));

                            var customerSearch = search.load({
                                    id: customer_id,
                                    type: 'customer'
                                })
                                // var note = customerSearch.getField({
                                //     fieldId: string
                                // });

                            var note = 'User Notes Information - AC 9/11/20';

                            debt_set.push({
                                inid: invoice_id_set,
                                cid: customer_id,
                                cm: customer_name,
                                zee: zee_name,
                                tn: total_num,
                                ta: total_amount,
                                nt: note
                            });

                            return true;
                        }
                    }
                });
            }

            // var will_reschedule = (indexInCallback < 999) ? false : true;
            // if (will_reschedule) {
            //     // If the script will be rescheduled, we look for the element 999 of the loop to see if it is empty or not.
            //     var resultSet = invResultSet.getResults(main_index + index_in_callback, main_index + index_in_callback + 1);
            // } else {
            //     // If the script will not be rescheduled, we make sure we didn't miss any results in the search.
            //     var resultSet = invResultSet.getResults(main_index + index_in_callback + 1, main_index + index_in_callback + 2);
            // }

            // var invRecord = nlapiCreateRecord('customrecord_debt_coll_inv');
            var invRecord = record.create({
                type: 'customrecord_debt_coll_inv'
            });

            var debt_record_name = 'Range_' + range_id + '_date_from:' + date_from + '_date_to:' + date_to;
            invRecord.setValue({
                fieldId: 'name',
                value: debt_record_name
            });
            invRecord.setValue({
                fieldId: 'custrecord_debt_coll_inv_id',
                value: JSON.stringify(invoice_id_set)
            });
            // invRecord.setValue({ 
            //     fieldId: 'custrecord_debt_inv_date_from',
            //     value: date_from 
            // });
            // invRecord.setValue({ 
            //     fieldId: 'custrecord_debt_inv_date_to',
            //     value: date_to 
            // });
            invRecord.setValue({
                fieldId: 'custrecord_debt_inv_set',
                value: JSON.stringify(debt_set)
            });

            invRecord.save();
        }

        function invoiceSearch(selector_id, selector_type, date_from, date_to) {
            var invoiceResult = search.load({
                id: 'customsearch_debt_coll_inv',
                type: 'invoice',
                filters: [
                        ["type", "anyof", "CustInvc"],
                        "AND", ["mainline", "is", "T"],
                        "AND", ["status", "anyof", "CustInvc:A"],
                        "AND", ['trandate', 'within', date_from, date_to],
                        "AND", ['trandate', 'before', date_to],
                        "AND", ['trandate', 'after', date_from]
                    ]
                    // if (!isNullorEmpty(date_to) && !isNullorEmpty(date_to)){
                    //     filters:
                    //         [
                    //             ['trandate','within', date_from, date_to],
                    //             "AND",
                    //             ['trandate', 'before', date_to],
                    //             "AND",
                    //             ['trandate', 'after', date_from]
                    //         ]
                    // },
                    // switch (selector_type){
                    //     case '':
                    //         filters: [[]],
                    //         break;

                //     case '':
                //         filters: [[]],
                //         break,

                //     case '': 
                //         filters: [[]],
                //         break,

                //     default:
                //         filters: [[]],
                //         break
                // }           
            });
            result = invoiceResult.run();

            return result;
        }

        function isNullorEmpty(val) {
            if (val == '' || val == null) {
                return true;
            } else {
                return false;
            }
        }

        return {
            execute: debtCollection
        }
    });