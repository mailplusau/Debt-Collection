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
    function (runtime, search, record, log, task, currentRecord, format) {
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
            var emp_id = ctx.getParameter({ name: 'custscript_debt_inv_assign_emp_id' }); // Array of Id's for Employees
            // emp_id = emp_id.split(',');
            // log.debug({
            //     title: 'Employee ID',
            //     details: emp_id
            // });
            // log.debug({
            //     title: 'Employee ID: 1',
            //     details: emp_id[0]
            // });

            var split_bool = ctx.getParameter({ name: 'custscript_debt_inv_assign_emp_split' });
            if (!isNullorEmpty(split_bool)){
                split_bool = true;
                var emp_split_id = ctx.getParameter({ name: 'custscript_debt_inv_assign_emp_split_id' }); 
            } else {
                split_bool = false;
            }

            var assign_id = ctx.getParameter({ name: 'custscript_debt_inv_assign_id' }); 
            if (isNullorEmpty(assign_id)){
                assign_id = 0;
            }

            var main_index = ctx.getParameter({ name: 'custscript_debt_inv_assign_main_index' });
            if (isNullorEmpty(main_index)) {
                main_index = 0;
            }
            log.debug({
                title: 'main_index',
                details: main_index
            });

            var count = ctx.getParameter({ name: 'custscript_debt_inv_assign_count' });
            if (isNullorEmpty(count)) {
                count = 0;
            }
            

            var invoice_id_set = ctx.getParameter({ name: 'custscript_debt_inv_assign_invoice_id' });
            if (isNullorEmpty(invoice_id_set)) {
                invoice_id_set = JSON.parse(JSON.stringify([]));
            } else {
                invoice_id_set = JSON.parse(invoice_id_set);
            }
            
            var invResultSet = search.load({
                id: 'customsearch_debt_coll_inv_2',
                type: 'invoice'
            });

            if (split_bool == true){
                invResultSet.filters.push(search.createFilter({
                    name: 'custentity_debt_coll_auth_id',
                    join: 'customer',
                    operator: search.Operator.IS,
                    values: emp_split_id
                }));
            }
            // var resultsSet = invResultSet.run().getRange({
            //     start: main_index,
            //     end: main_index + 999
            // });
            var resultsSet = invResultSet.run().getRange({
                start: 0,
                end: 9
            });
            var result_count = invResultSet.runPaged().count;
            log.debug({
                title: 'Result Count',
                details: result_count
            });
            split_count = parseInt(result_count / count); // count = 12000, split_count == 4000. Everytime its 4000, it will increment auth_id, changing team member name and setting that.
            log.debug({
                title: 'Divided Count',
                details: split_count
            });
            /**
             *  Test Conditions:
             */
            
            // emp_id = ['924435', '1115209', '409635']; // 1 - Anesu | 2 - Sruti | 3 - Ankith
            // split_count = 7
            
            resultsSet.forEach(function (invoiceSet, index) {
                indexInCallback = index;
                seconday_index = main_index + index;

                var usageLimit = ctx.getRemainingUsage();
                if (usageLimit < 200 || main_index == 999) {
                    params = {
                        custscript_debt_inv_assign_main_index: main_index + index - 5,
                        custscript_debt_inv_assign_id: assign_id,
                        custscript_debt_inv_assign_count: split_count,
                        custscript_debt_inv_assign_invoice_id_set: JSON.stringify(invoice_id_set)
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

                    log.audit({
                        title: 'In Search: Secondary Index',
                        details: seconday_index
                    })
                    var cust_id = invoiceSet.getValue({
                        name: 'internalid',
                        summary: search.Summary.GROUP,
                        join: 'customer'
                    });
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
                            details: 'Customer ID: ' + cust_id + ' | Author ID: ' + custAuthField + ' | Current Employee ID: ' + emp_id[assign_id] + ' | Assigned ID ' + assign_id
                        });

                        custRecord.setValue({
                            fieldId: 'custentity_debt_coll_auth_id',
                            value: parseInt(emp_id[assign_id]) // Turkan
                        });

                        // var custRecSaveTicket = custRecord.save();
                        var custRecSaveTicket = 'Saved'
                        log.audit({
                            title: 'Record Finished',
                            details: custRecSaveTicket
                        });

                        log.audit({
                            title: 'Assigned ID',
                            details: assign_id
                        });
                        if (seconday_index % split_count == 0 && seconday_index != 0) { // 4000 = 4000
                            if (assign_id <= (emp_id.length-1)) {
                                assign_id ++; // ie, whenever it hits the split count amount, increment auth_id by 1, changing allocated finance team member.
                            }
                        }
                    }

                    return true;
                }
            });
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