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

define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/redirect'],
    function(ui, email, runtime, search, record, http, log, redirect) {
        var zee = 0;
        var role = 0;

        var baseURL = 'https://system.na2.netsuite.com';
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

        var zee_id;
        var date_from;
        var date_to;

        var indexInCallback = 0;
        // var ctx = nlapiGetContext();

        function debtCollection() {
            var script_main_index = parseInt(ctx.getSetting('SCRIPT', 'custscript_main_index'));
            if(!isNaN(script_main_index)){
                var main_index = script_main_index;
            } else {
                var main_index = 0;
            }

            log.debug({
                title: 'main_index',
                details: main_index
            });

            var invResultSet = invoiceSearch(date_from, date_to);
            var resultsSet = invResultSet.getResults(main_index, main_index + 1000);

            resultsSet.each(function(item, index) {
                indexInCallback = index;
                var usageLimit = ctx.getRemainingUsage();
            
                if(usageLimit < 200 || index == 999){

                    params = {
                        custscript_main_index : main_index + index
                    };
                    
                    reschedule = nlapiScheduleScript(ctx.getScriptId(), ctx.getDeploymentId(), params);
                    nlapiLogExecution('DEBUG', 'Attempting: Rescheduling Script', reschedule);
                    if (reschedule == false){
                        nlapiLogExecution('DEBUG', 'Rescheduling Completed', reschedule);
                        return false;
                    }
                }else{
                    
                    
                }
            });

            var will_reschedule = (indexInCallback < 999) ? false : true;
            if (will_reschedule) {
                // If the script will be rescheduled, we look for the element 999 of the loop to see if it is empty or not.
                var resultSet = serviceAndFinancialPrices.runSearch().getResults(main_index + index_in_callback, main_index + index_in_callback + 1);
            } else {
                // If the script will not be rescheduled, we make sure we didn't miss any results in the search.
                var resultSet = serviceAndFinancialPrices.runSearch().getResults(main_index + index_in_callback + 1, main_index + index_in_callback + 2);
            }
        }

        function invoiceSearch(date_from, date_to){
            var invoiceResult = search.load({
                id: string,
                type: string
            });

            invoiceResult.filters.push(search.createFilter({
                name: 'entity',
                operator: search.Operator.ISEMPTY
            }));

            return invoiceResult;
        }

        return {
            debtCollection: debtCollection,
            invoiceSearch: invoiceSearch
        }
    }
);