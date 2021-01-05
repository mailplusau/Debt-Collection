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
            var range_id = ctx.getParameter({ name: 'custscript_debt_inv_range' });
            if (isNullorEmpty(range_id)) {
                range_id = [1]
                // range_id = parseInt(range_id);
            } else {
                range_id = JSON.parse(range_id);
                log.debug({
                    title: 'Range ID',
                    details: range_id
                });
            }

            var date_from = ctx.getParameter({ name: 'custscript_debt_inv_date_from' });
            if (isNullorEmpty(date_from) || isNaN(date_to)) {
                date_from = '1/01/2017';
            }

            var date_to = ctx.getParameter({ name: 'custscript_debt_inv_date_to' });
            if (isNullorEmpty(date_to) || isNaN(date_to)) {
                // date_to = '17/12/2020';
                date_to = getDate();
                log.debug({
                    title: 'Current Date',
                    details: getDate()
                })
            }

            var main_index = ctx.getParameter({ name: 'custscript_debt_inv_main_index' });
            if (!isNullorEmpty(main_index)){ var testing = 'RESCHEDULED: ' + main_index;}
            log.debug({
                title: 'main_index_rescheduled',
                details: testing
            });
            if (isNullorEmpty(main_index)) {
                main_index = 0;
            }
            log.debug({
                title: 'main_index',
                details: main_index
            });
            
            // if (main_index = 0) {
            //     deleteRecords();
            // }

            var invoice_id_set = ctx.getParameter({ name: 'custscript_debt_inv_invoice_id_set' });
            // var invoice_id_set;
            if (isNullorEmpty(invoice_id_set)) {
                invoice_id_set = JSON.parse(JSON.stringify([]));
            } else {
                invoice_id_set = JSON.parse(invoice_id_set);
                log.debug({
                    title: 'Invoice ID Set',
                    details: invoice_id_set
                })
            }

            var invResultSet = invoiceSearch(range_id, date_from, date_to);
            var resultsSet = invResultSet.getRange({
                start: main_index,
                end: main_index + 999
            });

            resultsSet.forEach(function(invoiceSet, index) {
                indexInCallback = index;

                var usageLimit = ctx.getRemainingUsage();
                if (usageLimit < 100) {
                    params = {
                        custscript_debt_inv_main_index: main_index + index - 10,
                        custscript_debt_inv_range: range_id,
                        custscript_debt_inv_date_from: date_from,
                        custscript_debt_inv_date_to: date_to,
                        custscript_debt_inv_invoice_id_set: JSON.stringify(invoice_id_set)
                    };
                    log.debug({
                        title: 'Parameters - Main Index',
                        details: params.custscript_debt_inv_main_index
                    });
                    log.debug({
                        title: 'Invoice ID Set - Length',
                        details: invoice_id_set.length
                    });

                    // if (main_index = resultsSet.length) {
                    //     log.debug({
                    //         title: 'Reschedule: Completed',
                    //         details: reschedule
                    //     });
                    // } else {
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
                    var invoice_id = invoiceSet.getValue({
                        name: 'internalid'
                    });
                    log.debug({
                        title: 'Invoice ID',
                        details: invoice_id
                    });
                    if (invoice_id_set.indexOf(invoice_id) == -1) {
                        invoice_id_set.push(invoice_id);
                        log.debug({
                            title: 'Index - Search',
                            details: 'Total Number of Invoices Loaded: ' + index
                        });
                        var date = invoiceSet.getValue({
                            name: 'trandate'
                        });
                        log.debug({
                            title: 'Date',
                            details: date
                        });
                        var invoice_name = invoiceSet.getValue({
                            name: 'tranid'
                        });
                        var customer_id = invoiceSet.getValue({
                            name: 'internalid',
                            join: 'customer'
                        });
                        var customer_name = invoiceSet.getText({
                            name: 'entity'
                        });
                        var zee_name = invoiceSet.getText({
                            name: 'partner'
                        });
                        // var total_num = '';
                        var total_amount = parseFloat(invoiceSet.getValue({
                            name: 'amount'
                        }));
                        var due_date = invoiceSet.getValue({
                            name: 'duedate'
                        });
                        var overdue = invoiceSet.getValue({
                            name: 'daysoverdue'
                        });
                        var mp_ticket = invoiceSet.getValue({
                            name: 'custbody_mp_ticket'
                        })
                        var period = invoiceSet.getText({
                            name: 'postingperiod'
                        });
                        var note = '';
                        // var note_filter = search.createFilter({
                        //     name: 'internalid',
                        //     join: 'customer',
                        //     operator: search.Operator.IS,
                        //     values: customer_id
                        // });
                        // var noteSearch = search.load({
                        //     id: 'customsearch_debt_coll_note',
                        //     type: 'note'
                        // });
                        // noteSearch.filters.push(note_filter);
                        // var noteResults = noteSearch.run().getRange({
                        //     start: 0,
                        //     end: 1
                        // });
                        // noteResults.forEach(function(noteSet, index) {
                        //     note = noteSet.getValue({
                        //         name: 'note'
                        //     });
                        //     log.debug({
                        //         title: 'Note information',
                        //         details: note
                        //     })
                        //     log.debug({
                        //         title: 'Number of Notes Searched - Should be 1',
                        //         details: index
                        //     })
                        // });

                        var maap_status = 'Not Payed';
                        var maap_bankacc = invoiceSet.getValue({ name: 'custbody_maap_bankacct' });
                        var bankacc_filter = search.createFilter({
                            name: 'custbody_maap_tclientaccount',
                            operator: search.Operator.IS,
                            values: maap_bankacc
                        });
                        // var date_to_filter = search.createFilter({
                        //     name: 'datecreated',
                        //     operator: search.Operator.ONORBEFORE,
                        //     values: maap_date_to
                        // });
                        // var date_from_filter = search.createFilter({
                        //     name: 'datecreated', //trandate
                        //     operator: search.Operator.ONORAFTER,
                        //     values: maap_date_from
                        // });
                        var maap_status_search = search.load({
                            id: 'customsearch_debt_coll_maap_pmts',
                            type: 'customerpayment'
                        });
                        // maap_status_search.filters.push(date_to_filter);
                        // maap_status_search.filters.push(date_from_filter);
                        maap_status_search.filters.push(bankacc_filter);
                        var maap_results = maap_status_search.run().getRange({
                            start: 0,
                            end: 1
                        });
                        maap_results.forEach(function(status) {
                            var client_number = status.getValue({ name: 'custbody_maap_tclientaccount' });
                            if (maap_bankacc == client_number) {
                                maap_status = 'Payed';
                            }
                        });

                        if (!isNullorEmpty(zee_name) || !isNullorEmpty(customer_name) || invoice_id != 'Memorized') {
                            var invRecord = record.create({
                                type: 'customrecord_debt_coll_inv'
                            });
                            var debt_record_name = 'date:' + date + '_id:' + invoice_id + '_range:' + range_id;
                            invRecord.setValue({
                                fieldId: 'name',
                                value: debt_record_name
                            });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_id',
                                value: invoice_id
                            });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_name',
                                value: invoice_name
                            });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_range',
                                value: JSON.stringify(range_id)
                            });
                            var parsedDateStringAsRawDateObject = format.parse({
                                value: date,
                                type: format.Type.DATE
                            }); // Parse Date String as Raw Date Object
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_date',
                                value: parsedDateStringAsRawDateObject
                            });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_cust_id',
                                value: customer_id
                            });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_cust_name',
                                value: customer_name
                            });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_zee_id',
                                value: zee_name
                            });
                            // invRecord.setValue({
                            //     fieldId: 'custrecord_debt_coll_inv_tot_num',
                            //     value: total_num
                            // });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_tot_am',
                                value: total_amount
                            });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_overdue',
                                value: overdue
                            });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_due_date',
                                value: due_date
                            });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_period',
                                value: period
                            });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_mp_ticket',
                                value: mp_ticket
                            });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_note',
                                value: note
                            });
                            invRecord.setValue({
                                fieldId: 'custrecord_debt_coll_inv_status',
                                value: maap_status
                            });

                            invRecord.save();
                        }
                        return true;
                    }
                }
            });

            while(JSON.parse(range_id) <= 3 || JSON.parse(range_id) != 4 || JSON.parse(range_id) < 4){
                var debtNextResultArray = invResultSet.getRange({
                    start: main_index + indexInCallback + 1,
                    end: main_index + indexInCallback + 2
                }); 
                if (debtNextResultArray.length == 0) {
                    var range_id_reschedule = JSON.parse(range_id) + 1;
                    log.debug({
                        title: 'Rescheduled: Next Array Initiated'
                    });
                    log.debug({
                        title: 'Rescheduled: Range Incremented',
                        details: range_id_reschedule
                    });
                    var params2 = {
                        custscript_debt_inv_main_index: 0,
                        custscript_debt_inv_range: [range_id_reschedule],
                        custscript_debt_inv_date_from: date_from,
                        custscript_debt_inv_date_to: date_to,
                        custscript_debt_inv_invoice_id_set: JSON.stringify([]),
                    };
                    if (range_id_reschedule < 4 || range_id_reschedule != 4) {
                        var reschedule2 = task.create({
                            taskType: task.TaskType.SCHEDULED_SCRIPT,
                            scriptId: 'customscript_ss_debt_collection',
                            deploymentId: 'customdeploy_ss_debt_collection',
                            params: params2
                        });
                        var reschedule_id2 = reschedule2.submit();
                        log.debug({
                            title: 'Rescheduled: Next Array Complete',
                            details: task.checkStatus({
                                taskId: reschedule_id2
                            })
                        });
                    }
                }
            }
        }
        
        

        function invoiceSearch(range, date_from, date_to) {
            var date_to_Filter = search.createFilter({
                name: 'trandate',
                operator: search.Operator.ONORBEFORE,
                values: date_to
            });
            var date_from_Filter = search.createFilter({
                name: 'trandate',
                operator: search.Operator.ONORAFTER,
                values: date_from
            });
            for (var i = 0; i < range.length; i++) {
                var selector_id = JSON.parse(range[i]);
                if (selector_id == '1') {
                    log.debug({
                        title: 'Range ID Selection',
                        details: 'MPEX Products Selected'
                    });
                    var myFilter1 = search.createFilter({
                        name: 'custbody_inv_type',
                        operator: search.Operator.ANYOF,
                        values: '8'
                    });
                }
                if (selector_id == '2') {
                    log.debug({
                        title: 'Range ID Selection',
                        details: '0 - 59 Days Selected'
                    });
                    var myFilter2 = search.createFilter({
                        name: 'daysoverdue',
                        operator: search.Operator.LESSTHAN,
                        values: '60'
                    });
                }
                if (selector_id == '3') {
                    log.debug({
                        title: 'Range ID Selection',
                        details: '60+ Days Selected'
                    });
                    var myFilter3 = search.createFilter({
                        name: 'daysoverdue',
                        operator: search.Operator.GREATERTHANOREQUALTO,
                        values: '60'
                    });
                }
            }
            var invoiceResult = search.load({
                id: 'customsearch_debt_coll_inv',
                type: 'invoice'
            });
            invoiceResult.filters.push(date_to_Filter);
            invoiceResult.filters.push(date_from_Filter);
            if (!isNullorEmpty(myFilter1)) { invoiceResult.filters.push(myFilter1); }
            if (!isNullorEmpty(myFilter2)) { invoiceResult.filters.push(myFilter2); }
            if (!isNullorEmpty(myFilter3)) { invoiceResult.filters.push(myFilter3); }
            var searchResult = invoiceResult.run();

            return searchResult;
        }

        /**
         * @param   {Number} x
         * @returns {String} The same number, formatted in Australian dollars.
         */
        function financial(x) {
            if (typeof(x) == 'string') {
                x = parseFloat(x);
            }
            if (isNullorEmpty(x) || isNaN(x)) {
                return "$0.00";
            } else {
                return x.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
            }
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
                    type: format.Type.DATE
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