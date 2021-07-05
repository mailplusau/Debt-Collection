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
 * @Last Modified by:   Anesu Chakaingesu
 * @Last Modified time: 2020-10-22 16:49:26
 * 
 */

define(['N/runtime', 'N/search', 'N/record', 'N/log', 'N/task', 'N/currentRecord', 'N/format'],
    function(runtime, search, record, log, task, currentRecord, format) {
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
        var currRec = currentRecord.get();
        var ctx = runtime.getCurrentScript();

        function debtCollection() {

            var auth_id = 1; // 1 == Turkan, 2 == Jasmeet, 3 == Yassine.

            var invResultSet = search.load({
                id: 'customsearch_debt_coll_inv',
                type: 'invoice'
            });
            // var filter = search.createFilter({
            //     name: string,
            //     join: string,
            //     operator: string,
            //     values: 
            // });
            var count = invResultSet.runPaged().count;
            var div_count = count / 3; // count = 12000, div_count == 4000. Everytime its 4000, it will increment auth_id, changing team member name and setting that.

            var resultsSet = invResultSet.getRange({
                start: main_index,
                end: main_index + 999
            });

            resultsSet.forEach(function(invoiceSet, index) {
                indexInCallback = index;

                var usageLimit = ctx.getRemainingUsage();
                if (usageLimit < 200) {
                    params = {
                        custscript_debt_inv_main_index: main_index + index - 10,
                        custscript_debt_inv_range: auth_id,
                        custscript_debt_inv_count: div_count,
                        custscript_debt_inv_invoice_id_set: JSON.stringify(invoice_id_set)
                    };
                    var reschedule = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: 'customscript_ss_debt_collection',
                        deploymentId: 'customdeploy_ss_debt_collection',
                        params: params
                    });
                    var reschedule_id = reschedule.submit();
                    log.debug({
                        title: 'Attempting: Rescheduling Script',
                        details: reschedule
                    });
                    return false;
                    // }
                } else {
                    var cust_id = invoiceSet.getValue({
                        name: 'internalid',
                        join: 'customer'
                    });
                    var custRecord = record.load({
                        type: 'customer',
                        id: cust_id
                    });
                    var custAuthField = custRecord.getValue({
                        fieldId: 'custentity_debt_coll_auth_id'
                    });
                    if (isNullorEmpty(custAuthField)) {
                        if (auth_id = 1) {
                            custRecord.setValue({
                                fieldId: 'custrecord_debt_coll_auth_id',
                                value: '691582' // Turkan
                            });
                        }
                        if (auth_id = 2) {
                            custRecord.setValue({
                                fieldId: 'custrecord_debt_coll_auth_id',
                                value: '1403209' // Jasmeet
                            });
                        }
                        if (auth_id = 3) {
                            custRecord.setValue({
                                fieldId: 'custrecord_debt_coll_auth_id',
                                value: '755585' // Yassine
                            });
                        }

                        if (main_index = div_count) { // 4000 = 4000
                            auth_id++; // 2
                        }
                    }

                    return true;
                }
            });
        }

        /**
         * Compare Date String and Return true or false if older
         * @param {String} date1 Today's Date
         * @param {String} date2 Set Date
         */
        function dateCompare(date1, date2) {
            return date1 > date2;
        }

        function dateToISOString(date) {
            var date_split = date.split("/") //when date is entered in DD/MM/YYYY format. We split days months and year
            if (date_split[0].length == 1) {
                var days = '0' + date_split[0]; //get DD
                var month = date_split[1]; //get MM
                var year = date_split[2]; //get YYYY
            } else {
                var days = date_split[0]; //get DD
                var month = date_split[1]; //get MM
                var year = date_split[2]; //get YYYY
            }
            if (date_split[1].length == 1) {
                month = '0' + date_split[1]; //get MM
            } else {
                month = date_split[1]; //get MM
            }
            var date = year + '-' + month + '-' + days;

            return date;
        }

        /**
         * Used to pass the values of `date_from` and `date_to` between the scripts and to Netsuite for the records and the search.
         * @param   {String} date_iso       "2020-06-01"
         * @returns {String} date_netsuite  "1/6/2020"
         */
        function dateISOToNetsuite(date_iso) {
            var date_netsuite = '';
            if (!isNullorEmpty(date_iso)) {
                var date_utc = new Date(date_iso);
                // var date_netsuite = nlapiDateToString(date_utc);
                var date_netsuite = format.format({
                    value: date_utc,
                    type: format.Type.DATE,
                    timezone: format.Timezone.AUSTRALIA_SYDNEY
                });
            }
            return date_netsuite;
        }

        /**
         * [getDate description] - Get the current date
         * @return {[String]} [description] - return the string date
         */
        function getDate() {
            var date = new Date();
            date = format.format({
                value: date,
                type: format.Type.DATE,
                timezone: format.Timezone.AUSTRALIA_SYDNEY
            });

            return date;
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