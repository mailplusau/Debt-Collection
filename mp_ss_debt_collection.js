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

define(['N/runtime', 'N/search', 'N/record', 'N/log'],
    function(runtime, search, record, log) {
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

        function debtCollection(context) {
            // var date_from = ctx.getSetting('SCRIPT', 'custscript_debt_inv_date_from');
            var date_from = parseInt(ctx.getParameter({name: 'custscript_debt_inv_date_from'}));
            if (isNullorEmpty(date_from)) {
                date_from = '';
            }
            // var date_to = ctx.getSetting('SCRIPT', 'custscript_debt_inv_date_to');
            var date_to = parseInt(ctx.getParameter({name: 'custscript_debt_inv_date_to'}));
            if (isNullorEmpty(date_to)) {
                date_to = '';
            }
            // var script_main_index = parseInt(ctx.getSetting('SCRIPT', 'custscript_main_index'));
            var script_main_index = parseInt(ctx.getParameter({name: 'custscript_main_index'}));
            if(!isNaN(script_main_index)){
                var main_index = script_main_index;
            } else {
                var main_index = 0;
            }
                        
            // var range_id = ctx.getSetting('SCRIPT', 'custscript_debt_inv_range');
            var range_id = parseInt(ctx.getParameter({name: 'custscript_debt_inv_range'}));
            if (isNullorEmpty(range_id)){
                range_id = 0;
            }

            log.debug({
                title: 'main_index',
                details: main_index
            });

            var invResultSet = invoiceSearch(date_from, date_to);
            var resultsSet = invResultSet.getResults(main_index, main_index + 1000);

            resultsSet.each(function(invoiceSet, index) {
                indexInCallback = index;
                var usageLimit = ctx.getRemainingUsage();
            
                if(usageLimit < 200 || index == 999){

                    params = {
                        custscript_main_index : main_index + index,
                        custscript_debt_inv_range: range_id,
                        custscript_debt_inv_date_from: date_from,
                        custscript_debt_inv_date_to: date_to
                    };
                    
                    reschedule = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: ctx.scriptId,
                        deploymentId: ctx.deploymentId,
                        params: params
                    });
                    // nlapiLogExecution('DEBUG', 'Attempting: Rescheduling Script', reschedule);
                    log.debug({
                        title: 'reschedule',
                        details: 'Attempting: Rescheduling Script'
                    });
                    if (reschedule == false){
                        // nlapiLogExecution('DEBUG', 'Rescheduling Completed', reschedule);
                        log.debug({
                            title: 'reschedule',
                            details: 'Rescheduling Completed'
                        });
                        return false;
                    }
                } else {
                    var invoice_id = invoiceSet.getValue({
                        fieldId: 'internalid'
                    })
                    var customer_id = invoiceSet.getValue({
                        fieldId: 'internalid'
                    });

                    var customer_id = invoiceSet.getValue({
                        join: 'customer',
                        name: 'internalid'
                    });

                    var customer_name = invoiceSet.getValue({
                        join: "customer",
                        fieldId: 'companyname'
                    });

                    var zee_name = invoiceSet.getValue({
                        fieldId: 'partner'
                    });

                    var total_num = '1';

                    var total_amount = parseFloat(invoiceSet.getField({
                        fieldId: 'amount'
                    }));

                    // var note = invoiceSet.getField({
                    //     fieldId: string
                    // });

                    var note = 'testing testing';

                    debt_set.push({ 
                        inid: invoice_id,
                        cid: customer_id,
                        cm: customer_name, 
                        zee: zee_name,
                        tn: total_num,
                        ta: total_amount,
                        nt: note
                    });

                    return true;
                }                
            });

            var will_reschedule = (indexInCallback < 999) ? false : true;
            if (will_reschedule) {
                // If the script will be rescheduled, we look for the element 999 of the loop to see if it is empty or not.
                var resultSet = serviceAndFinancialPrices.run().getResults(main_index + index_in_callback, main_index + index_in_callback + 1);
            } else {
                // If the script will not be rescheduled, we make sure we didn't miss any results in the search.
                var resultSet = serviceAndFinancialPrices.run().getResults(main_index + index_in_callback + 1, main_index + index_in_callback + 2);
            }

            // var invRecord = nlapiCreateRecord('customrecord_debt_coll_inv');
            var invRecord = record.create({
                id: 'customrecord_debt_coll_inv'
            });

            var debt_record_name = 'range: ' + range_id + '_date_from:' + date_from + '_date_to:' + date_to;
            invRecord.setValue({
                fieldId: 'name', 
                value: debt_record_name
            });
            invRecord.setValue({ 
                fieldId: 'custrecord_debt_coll_inv_id',
                value: invoice_id_set 
            });
            invRecord.setValue({ 
                fieldId: 'custrecord_debt_inv_date_from',
                value: date_from 
            });
            invRecord.setValue({ 
                fieldId: 'custrecord_debt_inv_date_to',
                value: date_to 
            });
            invRecord.setValue({ 
                fieldId: 'custrecord_debt_inv_set',
                value: debt_set 
            });
            
            // nlapiSubmitRecord(invRecord);
            invRecord.save();
        }

        function invoiceSearch(date_from, date_to){
            var invoiceResult = search.load({
                id: 'customsearch_debt_coll_inv',
                type: 'invoice',
                filters:
                [
                    ["type","anyof","CustInvc"], 
                    "AND", 
                    ["mainline","is","T"], 
                    "AND", 
                    ["status","anyof","CustInvc:A"],
                    "AND", 
                    ['trandate','within', date_from, date_to]
                ]
            });

            invoiceResult.run();

            return invoiceResult;
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