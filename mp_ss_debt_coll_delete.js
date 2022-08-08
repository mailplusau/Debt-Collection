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

        function deleteRecords() {
            log.debug({
                title: 'DELETE STRING ACTIVATED'
            })
            var debtCollSearch = search.load({
                type: 'customrecord_debt_coll_inv',
                id: 'customsearch_debt_coll_table'
            });
            var searchResult = debtCollSearch.run();
            searchResult.each(function(result) {

                var index = result.getValue({
                    name: 'internalid'
                });
                var name = result.getValue({
                    name: 'name'
                });
                if (name != 'END') {
                    deleteResultRecord(index);
                } else {
                    record.delete({
                        type: 'customrecord_debt_coll_inv',
                        id: index
                    });
                    return true;
                }
                return true;
            });
        }

        function deleteResultRecord(index) {

            var usage_loopstart_cust = ctx.getRemainingUsage();
            if (usage_loopstart_cust < 4) { // || index == 3999
                // Rescheduling a scheduled script doesn't consumes any governance units.
                var delReschedule = task.create({
                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                    scriptId: 'customscript_ss_debt_coll_delete',
                    deploymentId: 'customdeploy_ss_debt_coll_delete'
                });
                var delResult = delReschedule.submit();
            }
            log.debug({
                title: 'Delete index',
                details: index
            });
            // Deleting a record consumes 4 governance units.
            record.delete({
                type: 'customrecord_debt_coll_inv',
                id: index
            });
            log.debug({
                title: 'Removed',
                details: 'Removed'
            });
        }

        return {
            execute: deleteRecords
        }
    });