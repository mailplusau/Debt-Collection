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
            var auth_id = ctx.getParameter({ name: 'custscript_debt_inv_auth_id' }); // 1 == Turkan, 2 == Jasmeet, 3 == Yassine.
            if (isNullorEmpty(auth_id)) {
                auth_id = 1;
            }
            log.debug({
                title: 'Allocate/Author ID',
                details: auth_id
            })

            var main_index = ctx.getParameter({ name: 'custscript_debt_inv_auth_main_index' });
            if (isNullorEmpty(main_index)) {
                main_index = 0;
            }
            log.debug({
                title: 'main_index',
                details: main_index
            });

            var split_count = ctx.getParameter({ name: 'custscript_debt_inv_auth_count' });
            if (isNullorEmpty(split_count)) {
                split_count = 0;
            }

            var invoice_id_set = ctx.getParameter({ name: 'custscript_debt_inv_auth_invoice_id_set' });
            if (isNullorEmpty(invoice_id_set)) {
                invoice_id_set = JSON.parse(JSON.stringify([]));
            } else {
                invoice_id_set = JSON.parse(invoice_id_set);
            }
            var columns = [];
            // columns[0] = search.createColumn({
            //     name: "companyname",
            //     join: "customer",
            //     summary: search.Summary.GROUP
            // });
            // columns[1] = search.createColumn({
            //     name: "internalid",
            //     join: "customer",
            //     sort: search.Sort.ASC,
            //     summary: search.Summary.GROUP
            // });
            var invResultSet = search.load({
                id: 'customsearch_debt_coll_inv_2',
                type: 'invoice',
                columns: columns
            });
            var resultsSet = invResultSet.run().getRange({
                start: main_index,
                end: main_index + 999
            });
            var count = invResultSet.runPaged().count;
            log.debug({
                title: 'Count',
                details: count
            })
            split_count = parseInt(count / 3); // count = 12000, split_count == 4000. Everytime its 4000, it will increment auth_id, changing team member name and setting that.
            log.debug({
                title: 'Divided Count',
                details: split_count
            })

            // log.debug({
            //     title: 'Results: JSON String',
            //     details: JSON.parse(JSON.stringify(resultsSet))
            // });
            resultsSet.forEach(function(invoiceSet, index) {
                indexInCallback = index;
                // main_index = index;
                seconday_index = main_index + index;

                var usageLimit = ctx.getRemainingUsage();
                if (usageLimit < 200 || main_index == 999) {
                    params = {
                        custscript_debt_inv_auth_main_index: main_index + index - 5,
                        custscript_debt_inv_auth_id: auth_id,
                        custscript_debt_inv_auth_count: split_count,
                        custscript_debt_inv_auth_invoice_id_set: JSON.stringify(invoice_id_set)
                    };
                    var reschedule = task.create({
                        taskType: task.TaskType.SCHEDULED_SCRIPT,
                        scriptId: 'customscript_ss_debt_coll_auth',
                        deploymentId: 'customdeploy_ss_debt_coll_auth',
                        params: params
                    });
                    var reschedule_id = reschedule.submit();
                    log.debug({
                        title: 'Attempting: Rescheduling Script',
                        details: reschedule
                    });
                    return false;
                } else {
                    // log.audit({
                    //     title: 'In Search: Results Value',
                    //     details: JSON.stringify(invoiceSet)
                    // });

                    log.audit({
                            title: 'In Search: Secondary Index',
                            details: seconday_index
                        })
                        // var cust_name = invoiceSet.getValue({
                        //     name: 'companyname',
                        //     summary: search.Summary.GROUP,
                        //     join: 'customer'
                        // });
                        // log.audit({
                        //     title: 'In Search: Customer Name',
                        //     details: cust_name
                        // })
                    var cust_id = invoiceSet.getValue({
                        name: 'internalid',
                        summary: search.Summary.GROUP,
                        join: 'customer'
                    });
                    log.audit({
                        title: 'In Search: Customer ID',
                        details: cust_id
                    })
                    if (invoice_id_set.indexOf(cust_id) == -1) {
                        invoice_id_set.push(cust_id);
                        var custRecord = record.load({
                            type: 'customer',
                            id: cust_id
                        });
                        var custAuthField = custRecord.getValue({
                            fieldId: 'custentity_debt_coll_auth_id'
                        });
                        log.audit({
                                title: 'In Search: Get Cust Value',
                                details: 'Customer ID: ' + cust_id + ' | Author ID: ' + custAuthField
                            })
                            // if (isNullorEmpty(custAuthField)) {
                        log.audit({
                            title: 'In Search: Allocate/Author ID',
                            details: auth_id
                        })
                        if (auth_id == 1) {
                            custRecord.setValue({
                                fieldId: 'custentity_debt_coll_auth_id',
                                value: 691582 // Turkan
                            });
                        }
                        if (auth_id == 2) {
                            custRecord.setValue({
                                fieldId: 'custentity_debt_coll_auth_id',
                                value: 1403209 // Jasmeet
                            });
                        }
                        if (auth_id == 3) {
                            custRecord.setValue({
                                fieldId: 'custentity_debt_coll_auth_id',
                                value: 755585 // Yassine
                            });
                        }

                        var custRecSaveTicket = custRecord.save();
                        // var custRecSaveTicket = 'Saved'
                        log.audit({
                            title: 'Record Finished',
                            details: custRecSaveTicket
                        });

                        log.audit({
                            title: 'Allocation ID',
                            details: auth_id
                        });
                        if (seconday_index % split_count == 0 && seconday_index != 0) { // 4000 = 4000
                            if (auth_id <= 3) {
                                auth_id++; // ie, whenever it hits the split count amount, increment auth_id by 1, changing allocated finance team member.
                            }
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