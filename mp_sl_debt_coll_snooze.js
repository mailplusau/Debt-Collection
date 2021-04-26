/**
 * @NApiVersion 2.0
 * @NScriptType Suitelet
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

define(['N/ui/serverWidget', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/redirect', 'N/task', 'N/format'],
    function(ui, email, runtime, search, record, http, log, redirect, task, format) {
        var zee = 0;
        var role = 0;

        var baseURL = 'https://1048144.app.netsuite.com';
        if (runtime.EnvType == "SANDBOX") {
            baseURL = 'https://1048144-sb3.app.netsuite.com';
        }

        role = runtime.getCurrentUser().role;

        if (role == 1000) {
            zee = runtime.getCurrentUser().id;
        } else if (role == 3) { //Administrator
            zee = 6; //test
        } else if (role == 1032) { // System Support
            zee = 425904; //test-AR
        }

        function onRequest(context) {
            if (context.request.method === 'GET') {
                var params = context.request.parameters;
                var is_params = false;

                var invoice_id = params.invid;
                var date;
                var period;
                var record_id;
                var viewed;

                if (!isNullorEmpty(invoice_id)){
                    is_params = true;

                    invoice_id = params.invid;
                    date = params.date;
                    period = params.period;
                    record_id = params.recordid;
                    viewed = params.viewed;
                }

                log.debug({
                    title: 'invoice_id',
                    details: invoice_id
                })
                log.debug({
                    title: 'date',
                    details: date
                })
                log.debug({
                    title: 'period',
                    details: period
                })
                log.debug({
                    title: 'record_id',
                    details: record_id
                });
                log.debug({
                    title: 'viewed',
                    details: viewed
                });
                
                var form = ui.createForm({
                    title: 'Debt Collection - Snooze'
                });

                // Load jQuery
                var inlineHtml = '<script src="https://code.jquery.com/jquery-1.12.4.min.js" integrity="sha384-nvAa0+6Qg9clwYCGGPpDQLVpLNn0fRaROjHqs13t4Ggj3Ez50XnGQqc/r8MhnRDZ" crossorigin="anonymous"></script>';
                // Load Tooltip
                inlineHtml += '<script src="https://unpkg.com/@popperjs/core@2"></script>';

                // Load Bootstrap
                inlineHtml += '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css" integrity="sha384-HSMxcRTRxnN+Bdg0JdbxYKrThecOKuH5zCYotlSAcp1+c8xmyTe9GYg1l9a69psu" crossorigin="anonymous">';
                inlineHtml += '<script src="https://stackpath.bootstrapcdn.com/bootstrap/3.4.1/js/bootstrap.min.js" integrity="sha384-aJ21OjlMXNL5UyIl/XNwTMqvzeRMZH2w8c5cRVpzpU8Y5bApTppSuUkhZXN0VxHd" crossorigin="anonymous"></script>';
                // Load DataTables
                inlineHtml += '<link rel="stylesheet" type="text/css" href="//cdn.datatables.net/1.10.21/css/jquery.dataTables.min.css">';
                inlineHtml += '<script type="text/javascript" charset="utf8" src="//cdn.datatables.net/1.10.21/js/jquery.dataTables.min.js"></script>';

                // Load Bootstrap-Select
                inlineHtml += '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/css/bootstrap-select.min.css">';
                inlineHtml += '<script src="https://cdn.jsdelivr.net/npm/bootstrap-select@1.13.14/dist/js/bootstrap-select.min.js"></script>';

                // Load Netsuite stylesheet and script
                inlineHtml += '<link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/>';
                inlineHtml += '<script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script>';
                inlineHtml += '<link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';
                inlineHtml += '<style>.mandatory{color:red;}</style>';

                if (is_params == true){
                    if (isNullorEmpty(period)){
                        inlineHtml += '<div><h4 style="text-align: center">Invoice has been set as viewed!</h4></div><br>';
                    } else {
                        inlineHtml += '<div><h4 style="text-align: center">Invoice has successfully been snoozed for a period of ' + period + '!</h4></div><br>';
                    }
                } else {
                    inlineHtml += '<div><h4 style="text-align: center">Invalid Parameters. Please Go Back to Debt Collections Page and Try Again</h4></div>'
                }

                if (!isNullorEmpty(invoice_id) && !isNullorEmpty(record_id) && !isNullorEmpty(date)){
                    inlineHtml += invoiceDetailsSection(invoice_id, period, record_id, date);
                }
                
                if(!isNullorEmpty(period)){
                    saveSnooze(invoice_id, period, record_id, date);
                }

                if (!isNullorEmpty(viewed)){
                    saveViewed(invoice_id, period, viewed, date)
                }

                form.addField({
                    id: 'preview_table',
                    label: 'inlinehtml',
                    type: 'inlinehtml'
                }).updateLayoutType({
                    layoutType: ui.FieldLayoutType.STARTROW
                }).defaultValue = inlineHtml;  
                
                form.addButton({
                    id: 'close',
                    label: 'Close'
                })

                form.addField({
                    id: 'custpage_debt_coll_invoice_id',
                    type: ui.FieldType.TEXT,
                    label: 'invoice_id'
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = invoice_id;

                form.addField({
                    id: 'custpage_debt_coll_date',
                    type: ui.FieldType.TEXT,
                    label: 'date'
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = date;

                form.addField({
                    id: 'custpage_debt_coll_period',
                    type: ui.FieldType.TEXT,
                    label: 'period'
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = period;

                form.addField({
                    id: 'custpage_debt_coll_record_id',
                    type: ui.FieldType.TEXT,
                    label: 'recordid'
                }).updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                }).defaultValue = record_id;

                form.clientScriptFileId = 4686514;

                context.response.writePage(form);
            } else {
                //
            }
        }

        function invoiceDetailsSection(invoice_id, period, record_id, date){
            var inlineQty = '';
            inlineQty = '<div class="form-group container invoice_section">';
            inlineQty += '<div class="row">';
            inlineQty += '<div class="col-xs-12 heading1"><h4><span class="label label-default col-xs-12">SNOOZED INVOICE DETAILS</span></h4></div>';
            inlineQty += '</div>';
            inlineQty += '</div>';

            inlineQty += '<div class="form-group container invoice_id_section">';
            inlineQty += '<div class="row">';
            inlineQty += '<div class="col-xs-6 invoice_id"><div class="input-group"><span class="input-group-addon" id="invoice_id_text">Invoice ID</span><input id="invoice_id" class="form-control invoice_id" value="' + invoice_id + '" data-oldvalue="' + invoice_id + '"/></div></div>';
            inlineQty += '<div class="col-xs-6 record_id"><div class="input-group"><span class="input-group-addon" id="record_id_text">Record ID</span><input id="record_id" class="form-control record_id" value="' + record_id + '" data-oldvalue="' + record_id + '"/></div></div>';
            inlineQty += '</div></div>';
            inlineQty += '</div>';
            inlineQty += '</div>';

            inlineQty += '<div class="form-group container _section">';
            inlineQty += '<div class="row">';
            inlineQty += '<div class="col-xs-6 period"><div class="input-group"><span class="input-group-addon" id="period_text">Period Duration</span><input id="period" class="form-control period" value="' + period + '" data-oldvalue="' + period + '"/></div></div>';
            inlineQty += '<div class="col-xs-6 date"><div class="input-group"><span class="input-group-addon" id="date_text">Date Snoozed Until</span><input id="date" class="form-control date" value="' + date + '" data-oldvalue="' + date + '"/></div></div>';
            inlineQty += '</div></div>';
            inlineQty += '</div>';
            inlineQty += '</div>';

            inlineQty += '</select></div></div>';
            inlineQty += '</div>';
            inlineQty += '</div>';

            return inlineQty;
        }

        function saveSnooze(invoice_id, period, record_id, date){
            var today = new Date();
            var today_year = today.getFullYear();
            var today_month = today.getMonth();
            var today_day = today.getDate() + 1;

            log.debug({
                title: 'today',
                details: today
            })
            log.debug({
                title: 'today_year',
                details: today_year
            })
            log.debug({
                title: 'today_month',
                details: today_month
            })
            log.debug({
                title: 'today_day',
                details: today_day
            });

            var today_in_day  = new Date(Date.UTC(parseInt(today_year), parseInt(today_month), parseInt(today_day) + 1));
            today_in_day.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
            today_in_day = today_in_day.toISOString().split('T')[0]; // Split Date String to get the date.
            today_in_day = dateISOToNetsuite(today_in_day); // Convert from 2021-01-28 to 28/1/2021
            today_in_day = format.parse({ value: today_in_day, type: format.Type.DATE }); // Date Object
            
            var today_in_2day  = new Date(Date.UTC(today_year, today_month, today_day + 2));
            today_in_2day.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })
            today_in_2day = today_in_2day.toISOString().split('T')[0];
            today_in_2day = dateISOToNetsuite(today_in_2day);
            today_in_2day = format.parse({ value: today_in_2day, type: format.Type.DATE }); // Date Object

            var today_in_week  = new Date(Date.UTC(today_year, today_month, today_day + 7));
            today_in_week.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })
            today_in_week = today_in_week.toISOString().split('T')[0];
            today_in_week = dateISOToNetsuite(today_in_week);
            today_in_week = format.parse({ value: today_in_week, type: format.Type.DATE }); // Date Object

            var today_in_2week  = new Date(Date.UTC(today_year, today_month, today_day + 14));
            today_in_2week.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })
            today_in_2week = today_in_2week.toISOString().split('T')[0];
            today_in_2week = dateISOToNetsuite(today_in_2week);
            today_in_2week = format.parse({ value: today_in_2week, type: format.Type.DATE }); // Date Object

            var one_year = new Date(Date.UTC(today_year + 1, today_month, today_day));
            one_year.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })
            one_year = one_year.toISOString().split('T')[0];
            one_year = dateISOToNetsuite(one_year);
            one_year = format.parse({ value: one_year, type: format.Type.DATE }); // Date Object

            switch(period) {
                case '1day': 
                    log.debug({
                        title: '1 Day',
                        details: '1 Day'
                    });       
                    var snoozeRecord = record.load({
                        type: 'invoice',
                        id: invoice_id
                    });
                    var date = snoozeRecord.getValue({
                        fieldId: 'custbody_invoice_snooze_date'
                    });
                    log.debug({
                        title: 'Date on Invoice Record',
                        details: today_in_day
                    });
                    snoozeRecord.setValue({
                        fieldId: 'custbody_invoice_snooze_date',
                        value: today_in_day
                    });
                    snoozeRecord.save();
                    var snoozeDelete = record.delete({
                        type: 'customrecord_debt_coll_inv',
                        id: record_id
                    });
                    log.debug({
                        title: 'Delete initiated - Record ID: ' + record_id,
                        details: 'Delete initiated - Record ID: ' + record_id
                    });
                    break; 
                case '2day': 
                    log.debug({
                        title: '2 Day',
                        details: '2 Day'
                    }); 
                    var snoozeRecord = record.load({
                        type: 'invoice',
                        id: invoice_id
                    });
                    var date = snoozeRecord.getValue({
                        fieldId: 'custbody_invoice_snooze_date'
                    });
                    log.debug({
                        title: 'Date for Snooze ' + date,
                        details: 'Date for Snooze ' + date
                    });
                    snoozeRecord.setValue({
                        fieldId: 'custbody_invoice_snooze_date',
                        value: today_in_2day
                    });
                    snoozeRecord.save();
                    var snoozeDelete = record.delete({
                        type: 'customrecord_debt_coll_inv',
                        id: record_id
                    });
                    log.debug({
                        title: 'Delete initiated - Record ID: ' + record_id,
                        details: 'Delete initiated - Record ID: ' + record_id
                    });
                    break;
                case '1week':
                    log.debug({
                        title: '1 Week',
                        details: '1 Week'
                    }); 
                    var snoozeRecord = record.load({
                        type: 'invoice',
                        id: invoice_id
                    });
                    var date = snoozeRecord.getValue({
                        fieldId: 'custbody_invoice_snooze_date'
                    });
                    log.debug({
                        title: 'Date for Snooze ' + date,
                        details: 'Date for Snooze ' + date,
                    })
                    snoozeRecord.setValue({
                        fieldId: 'custbody_invoice_snooze_date',
                        value: today_in_week
                    });
                    snoozeRecord.save();
                    var snoozeDelete = record.delete({
                        type: 'customrecord_debt_coll_inv',
                        id: record_id
                    });
                    log.debug({
                        title: 'Delete initiated - Record ID: ' + record_id,
                        details: 'Delete initiated - Record ID: ' + record_id
                    });
                    break;
                case '2week': 
                    log.debug({
                        title: '2 Week',
                        details: '2 Week'
                    });
                    var snoozeRecord = record.load({
                        type: 'invoice',
                        id: invoice_id
                    });
                    var date = snoozeRecord.getValue({
                        fieldId: 'custbody_invoice_snooze_date'
                    });
                    log.debug({
                        title: 'Date for Snooze ' + date,
                        details: 'Date for Snooze ' + date
                    })
                    snoozeRecord.setValue({
                        fieldId: 'custbody_invoice_snooze_date',
                        value: today_in_2week
                    });
                    snoozeRecord.save();    
                    var snoozeDelete = record.delete({
                        type: 'customrecord_debt_coll_inv',
                        id: record_id
                    });
                    log.debug({
                        title: 'Delete initiated - Record ID: ' + record_id,
                        details: 'Delete initiated - Record ID: ' + record_id
                    });
                    break;
                case 'permanent':
                    log.debug({
                        title: 'Permanent',
                        details: 'Permanent'
                    });
                    var snoozeRecord = record.load({
                        type: 'invoice',
                        id: invoice_id
                    });
                    var date = snoozeRecord.getValue({
                        fieldId: 'custbody_invoice_snooze_date'
                    });
                    log.debug({
                        title: 'Date for Snooze ' + date,
                        details: 'Date for Snooze ' + date
                    })
                    snoozeRecord.setValue({
                        fieldId: 'custbody_invoice_snooze_date',
                        value: one_year
                    });
                    snoozeRecord.save();    
                    var snoozeDelete = record.delete({
                        type: 'customrecord_debt_coll_inv',
                        id: record_id
                    });
                    log.debug({
                        title: 'Delete initiated - Record ID: ' + record_id,
                        details: 'Delete initiated - Record ID: ' + record_id
                    });
                default:
                    log.debug({
                        title: "No Snooze Date Note Saved",
                        details: period
                    });
            }

            return true;
        }

        function saveViewed(invoice_id, period, viewed, date){
            
            var today = new Date(Date.UTC());
            var today_year = today.getFullYear();
            var today_month = today.getMonth();
            var today_day = today.getDate() + 1;
            var today_in_2week  = new Date(Date.UTC(today_year, today_month, today_day + 14));
            today_in_2week = today_in_2week.toISOString().split('T')[0];
            today_in_2week = dateISOToNetsuite(today_in_2week);
            today_in_2week = format.parse({ value: today_in_2week, type: format.Type.DATE }); // Date Object  

            var invoiceRecord = record.load({
                type: 'invoice',
                id: invoice_id
            });              
            // var new_date = invoiceRecord.setValue({
            //     fieldId: 'custbody_invoice_snooze_date',
            //     value: today_in_2week
            // });
            // log.debug({
            //     title: 'new_date record ID',
            //     details: new_date
            // })
            var viewed = invoiceRecord.getValue({
                fieldId: 'custbody_invoice_viewed'
            });
            log.debug({
                title: 'viewed',
                details: viewed
            });
            viewed = invoiceRecord.setValue({
                fieldId: 'custbody_invoice_viewed',
                value: true
            });

            invoiceRecord.save();

            return true;
        }


        /**
         * Used to pass the values of `date_from` and `date_to` between the scripts and to Netsuite for the records and the search.
         * @param   {String} date_iso       "2020-06-01"
         * @returns {String} date_netsuite  "1/6/2020"
         */
        // function dateISOToNetsuite(date_iso) {
        //     var date_netsuite = '';
        //     if (!isNullorEmpty(date_iso)) {
        //         var date_utc = new Date(date_iso);
        //         // var date_netsuite = nlapiDateToString(date_utc);
        //         var date_netsuite = format.format({
        //             value: date_utc,
        //             type: format.Type.DATE
        //         });
        //     }
        //     return date_netsuite;
        // }
        function dateISOToNetsuite(date_iso){
            var parts = date_iso.split('-');

            if (!isNullorEmpty(date_iso)) {
                var date_utc = new Date(parts[0], parts[1] - 1, parts[2]);
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
            onRequest: onRequest
        }
    });
