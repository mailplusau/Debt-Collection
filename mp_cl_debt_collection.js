/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */

/** Module Description
 * 
 * NSVersion    Date                        Author         
 * 2.00         2020-10-22 09:33:08         Anesu
 *
 * Description: Automation of Debt Collection Process   
 * 
 * @Last Modified by:   Anesu
 * @Last Modified time: 2020-11-217 16:49:26
 * 
 */

define(['N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/error', 'N/url', 'N/format'],
    function(email, runtime, search, record, http, log, error, url, format) {
        var zee = 0;
        var role = 0;

        var baseURL = 'https://1048144.app.netsuite.com';
        if (runtime.EnvType == "SANDBOX") {
            baseURL = 'https://1048144-sb3.app.netsuite.com';
        }

        role = runtime.getCurrentUser().role;
        var userName = runtime.getCurrentUser().name;

        if (role == 1000) {
            zee = runtime.getCurrentUser().id;
        } else if (role == 3) { //Administrator
            zee = 6; //test
        } else if (role == 1032) { // System Support
            zee = 425904; //test-AR
        }

        var debtDataSet = JSON.parse(JSON.stringify([]));
        var debt_set = JSON.parse(JSON.stringify([]));

        function pageInit() {
            selectRangeOptions();
            // hideLoading();
            $('#submit_section').show();
            $('#debt_preview').hide();

            $('#submit').click(function() {
                $('#submit_section').hide();
                // table.clear();
                // table.destroy();
                // $('#load_section').hide();
                // $(document).ready(function() {
                    $('#debt_preview').DataTable({
                        data: debtDataSet,
                        pageLength: 100,
                        // destroy: true,
                        columns: [
                            { title: 'Date' },
                            { title: 'Company Name' },
                            { title: 'Franchisee' },
                            {
                                title: 'Total Number of Invoices',
                                type: 'num-fmt'
                            },
                            // Reduce width for franchisee and increase notes width.
                            {
                                title: 'Invoice Amount',
                                type: 'num-fmt'
                            },
                            {
                                title: 'Days Overdue',
                                type: 'num-fmt'
                            },
                            { title: 'Period' },
                            { title: 'Notes' },
                            // { title: ''},
                            { title: 'MAAP Payment Status' }
                        ],
                        columnDefs: [{
                                targets: [1, 3, 4, 5],
                                className: 'bolded'
                            },
                            {
                                width: '5%',
                                targets: [3, 4, 5]
                            },
                            {
                                width: '30%',
                                targets: [1, 7]
                            },
                            {
                                width: '20%',
                                targets: 2
                            },
                            {
                                targets: 8,
                                visible: false
                            }
                        ],
                        rowCallback: function(row, data) {
                            // $('td:eq(1)', row).html;
                            if (data[8] == 'Payed') {
                                if ($(row).hasClass('odd')) {
                                    $(row).css('background-color', 'YellowGreen');
                                } else {
                                    $(row).css('background-color', 'GreenYellow');
                                }
                            } else if (data[8] == 'Not Payed'){
                                if ($(row).hasClass('odd')){
                                    $(row).css('background-color', 'LightGoldenRodYellow');
                                } else {
                                    $(row).css('background-color', 'Ivory')
                                }
                            }
                        }
                    });
                // });
                $('#debt_preview').show();

                var range = $('#range_filter').val();
                $('#range_filter').selectpicker();
                // console.log(range);

                var date_from = $('#date_from').val();
                var date_to = $('#date_to').val();
                date_from = dateISOToNetsuite(date_from)
                date_to = dateISOToNetsuite(date_to);

                console.log('Load DataTable Params: ' + range + ' | ' + date_from + ' | ' + date_to);

                if (!isNullorEmpty(range) || !isNullorEmpty(date_from) || !isNullorEmpty(date_to) || range == null) {
                    loadDebtTable(range, date_from, date_to);
                } else {
                    error.create({
                        message: 'Please Select Date Range and Date Filter',
                        name: 'Invalid Data'
                    });
                }
                // $('.note').on('click', onclick_noteSection());
                // $('.note').on('click', console.log('HelloWorld'));
                // $('.note').blur(function() {
                //     // console.log((this.id).split('_')[1]);
                //     onclick_noteSection();
                // });
            });

            $('.note').on('click', console.log('HelloWorld'));
            $('.note').click(function() {
                console.log('Hello Verisons 2');
            });
            // $('.note').click(function() {
            //     // console.log((this.id).split('_')[1]);
            //     // onclick_noteSection();
            //     console.log('CLICKED!');
            // });

            if (!isNullorEmpty($('#period_dropdown option:selected').val())) {
                selectDate();
            }
            $('#period_dropdown').change(function() {
                selectDate();
            });
        }

        function hideLoading() {
            $('#debt_preview').hide();
            $('#load_section').hide();
        }

        function showResults() {
            $('#debt_preview').show();
            $('#load_section').show();
        }

        function onclick_noteSection() {
            var custid = (this.id).split('_')[1];
            console.log("Cust Id From Input Field: " + custid);
            var noteVal = $('#note_' + custid + '').val();
            console.log("Note Value: " + noteVal)

            var userNoteRecord = record.create({
                type: 'note'
            });
            userNoteRecord.setValue({
                fieldId: 'title',
                value: 'Debtor'
            });
            userNoteRecord.setValue({
                fieldId: 'entity',
                value: custid
            });
            userNoteRecord.setValue({
                fieldId: 'note',
                value: noteVal
            });
            userNoteRecord.setValue({
                fieldId: 'author',
                value: userName
            });
            userNoteRecord.setValue({
                fieldId: 'author',
                value: runtime.getCurrentUser().id
            });
            userNoteRecord.setValue({
                fieldId: 'notedate',
                value: getDate().toString()
            })

            userNoteRecord.save();
        }

        function loadDebtTable(range, date_from, date_to) { //selector_id, selector_type
            var date_to_Filter = search.createFilter({
                name: 'trandate',
                operator: search.Operator.BEFORE,
                values: date_to
            });
            var date_from_Filter = search.createFilter({
                name: 'trandate',
                operator: search.Operator.AFTER,
                values: date_from
            });
            for (var i = 0; i < JSON.parse(range.length); i++) {
                console.log('Range ID: ' + JSON.parse(range[i]));
                var selector_id = JSON.parse(range[i]);
                if (selector_id == '1') {
                    console.log('selector_id 1 selected');
                    var myFilter1 = search.createFilter({
                        name: 'custbody_inv_type',
                        operator: search.Operator.ANYOF,
                        values: '8'
                    });
                }
                if (selector_id == '2') {
                    console.log('selector_id 2 selected');
                    var myFilter2 = search.createFilter({
                        name: 'daysoverdue',
                        operator: search.Operator.LESSTHAN,
                        values: '60'
                    });
                }
                if (selector_id == '3') {
                    console.log('selector_id 3 selected');
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
            var searchResult = invoiceResult.run().getRange({
                start: 0,
                end: 25
            });
            console.log('Result Length: ' + searchResult.length);
            console.log(JSON.stringify(searchResult[0]));
            loadDebtRecord(searchResult, date_from, date_to);
        }

        function loadDebtRecord(searchResult, date_from, date_to) {
            // var invoiceResults = search.load({
            //     type: 'customrecord_debt_coll_inv',
            //     id: 'customsearch_debt_coll_table'

            // });
            // // console.log(invoiceResults);
            // var invoiceResult = invoiceResults.run();
            // console.log(invoiceResult);

            // if (!isNullorEmpty(invoiceResult)) {
            //     invoiceResult.each(function(debtRecord) {
            //         // var debtRecord = invoiceResult[0];
            //         console.log(debtRecord);
            //         var debt_rows = JSON.parse(debtRecord.getValue({
            //             name: 'custrecord_debt_inv_set'
            //         }));
            //         console.log(debt_rows);
            //         loadDatatable(debt_rows);
            //     });
            // }
            // var invResultSet = invoiceSearch(date_from, date_to);

            // if (!isNullorEmpty(invResultSet)) {
            //     invResultSet.forEach(function(invoiceSet, index) {
            if (!isNullorEmpty(searchResult)) {
                searchResult.forEach(function(invoiceSet, index) {
                    console.log('Index Search: ' + index);
                    var date = invoiceSet.getValue({
                        name: 'trandate'
                    });
                    // console.log(date);
                    var invoice_id = invoiceSet.getValue({
                        name: 'tranid'
                    });
                    var customer_id = invoiceSet.getValue({
                        name: 'internalid',
                        join: 'customer'
                    });
                    console.log('Customer ID: ' + customer_id);
                    var customer_name = invoiceSet.getText({
                        name: 'entity'
                    });
                    console.log('Customer Name: ' + customer_name);
                    var zee_name = invoiceSet.getText({
                        name: 'partner'
                    });
                    var total_num = '';
                    var total_amount = parseFloat(invoiceSet.getValue({
                        name: 'amount'
                    }));
                    var overdue = invoiceSet.getValue({
                        name: 'daysoverdue'
                    });
                    var period = invoiceSet.getText({
                        name: 'postingperiod'
                    });

                    var note_filter = search.createFilter({
                        name: 'internalid',
                        join: 'customer',
                        operator: search.Operator.IS,
                        values: customer_id
                    });
                    // filters: ['entity', 'is', 383257]
                        // columns: [
                        //     search.createColumn({
                        //         name: 'entity',
                        //         sort: search.Sort.DESC,

                        //     })
                        // ]
                        // filters: [
                        //     search.createFilter({
                        //         name: 'entity',
                        //         operator: search.Operator.IS,
                        //         values: 383257
                        //     })
                        // ]
                    var noteSearch = search.load({
                        id: 'customsearch_debt_coll_note',
                        type: 'note'  
                    });
                    noteSearch.filters.push(note_filter);
                    var noteResults = noteSearch.run().getRange({
                        start: 0,
                        end: 1
                    });
                    var note = '';
                    noteResults.forEach(function(noteSet, index) {
                        note = noteSet.getValue({
                            name: 'note'
                        });
                        // console.log('Note information: ' + note);
                        console.log('Number of Notes Searched: ' + index);
                    });
                    // console.log('searchResult[index - 1].id ' + searchResult[index - 1].id);
                    // var note = 'Placeholder (In Testing) - AC 9/11/20';

                    // Today's Data 
                    var today = new Date();
                    var today_day_in_month = today.getDate();
                    var today_month = today.getMonth();
                    var today_year = today.getFullYear();
                    var today_date = new Date(Date.UTC(today_year, today_month, today_day_in_month));
                    var previous_week_date = new Date(Date.UTC(today_year, today_month, today_day_in_month - 7));
                    var maap_date_from = today_date.toISOString().split('T')[0];
                    maap_date_from = dateISOToNetsuite(maap_date_from);
                    var maap_date_to = previous_week_date.toISOString().split('T')[0];
                    maap_date_to = dateISOToNetsuite(maap_date_to);

                    var maap_bankacc = invoiceSet.getValue({ name: 'custbody_maap_bankacct' });
                    
                    var maap_status = 'Not Payed'
                    var bankacc_filter = search.createFilter({
                        name: 'custbody_maap_tclientaccount',
                        operator: search.Operator.IS,
                        values: maap_bankacc
                    })
                    var date_to_filter = search.createFilter({
                        name: 'trandate',
                        operator: search.Operator.BEFORE,
                        values: maap_date_to
                    });
                    var date_from_filter = search.createFilter({
                        name: 'trandate',
                        operator: search.Operator.AFTER,
                        values: maap_date_from
                    });
                    var maap_status_search = search.load({
                        id: 'customsearch_debt_coll_maap_pmts',
                        type: 'customerpayment'
                    });
                    maap_status_search.filters.push(date_to_filter);
                    maap_status_search.filters.push(date_from_filter);
                    maap_status_search.filters.push(bankacc_filter);
                    var maap_results = maap_status_search.run();
                    
                    // console.log('MAAP Bank Acc: ' + maap_bankacc);
                    maap_results.each(function(status) {
                        // var client_number = status.getValue({ name: 'custbody_maap_tclientaccount' });
                        // if (maap_bankacc == client_number) {
                        console.log('MAAP Client Acc: ' + client_number);
                        maap_status == 'Payed';
                        // }
                    });

                    if (!isNullorEmpty(zee_name) || !isNullorEmpty(customer_name)) {
                        debt_set.push({
                            dt: date,
                            inid: invoice_id,
                            cid: customer_id,
                            cm: customer_name,
                            zee: zee_name,
                            tn: total_num,
                            ta: total_amount,
                            od: overdue,
                            p: period,
                            nt: note,
                            // ti: tick,
                            ms: maap_status
                        });
                    }
                    // loadingBar(index);
                    return true;
                });
                console.log('Data Set: ' + JSON.stringify(debt_set));
                loadDatatable(debt_set);
            } else {
                console.log('Results Empty');
            }
        }

        function loadDatatable(debt_rows) {
            $('#result_debt').empty();

            if (!isNullorEmpty(debt_rows)) {
                debt_rows.forEach(function(debt_row, index) {
                    var count = 0;
                    var date = debt_row.dt
                    var customer_id = debt_row.cid;
                    // console.log('Customer ID: ' + customer_id);
                    var cm_link = debt_row.cm;
                    // var upload_url = baseURL + '/app/site/hosting/scriptlet.nl?script=1046&deploy=1&compid=1048144_SB3&unlayered=T&custparam_params=%7B"custid":' + customer_id + ',"scriptid":"customscript_sl_customer_list","deployid":"customdeploy_sl_customer_list"%7D';  
                    var params = {
                        custid: customer_id,
                        scriptid: 'customscript_sl_customer_list',
                        deployid: 'customdeploy_sl_customer_list'
                    }
                    params = JSON.stringify(params);

                    // var upload_url = url.resolveScript({
                    //     scriptId: 'customscript_sl_lead_capture2',
                    //     deploymentId: 'customdeploy_sl_lead_capture2',
                    //     returnExternalUrl: true
                    // });
                    // var company_name = '<a href="' + upload_url + '&unlayered=T&custparam_params="' + params + '">' + cm_link + '</a>';
                    var upload_url = '/app/common/entity/custjob.nl?id=';
                    var company_name = '<a href="' + baseURL + upload_url + customer_id + '">' + cm_link + '</a>';

                    var zee = debt_row.zee;
                    // var tot_num = debt_row.tn;
                    // for (var i = 0; i < debt_rows.length; i++){
                    //     var customerID = debt_rows[i].cid;
                    //     if (customerID == customer_id){
                    //         count++;
                    //         console.log(count);
                    //     }
                    // }
                    var amount = parseFloat(debt_row.ta);
                    console.log('Amount :' + amount);
                    debt_rows.forEach(function(debt) {
                        var cust_name = debt.cm;
                        // if (debt.indexOf(cust_name) > 1 && debt_row.indexOf(cust_name) === -1){
                        if (cust_name == cm_link) {
                            count++;
                            // amount += parseFloat(debt.ta);
                        }
                        // }
                    });
                    // var debt = JSON.parse(debt_rows);
                    // console.log('Previous Customer Amount' + debt[index - 1].ta);

                    // if (stringSet[index - 1].cid == customer_id) {
                    //     count++;
                    //     amount += debt_rows[index - 1].ta;
                    // }

                    var tot_num = count;
                    var tot_am = amount;
                    tot_am = financial(tot_am);

                    var overdue = debt_row.od;
                    var period = debt_row.p;

                    var noteInfo = debt_row.nt;
                    var note = '<input id="note_' + customer_id + '" value="' + noteInfo + '" class="form-control note"/>';
                    var maap_status = debt_row.ms;

                    // console.log('Previous Customer ID' + debt_row[index - 1].cid);
                    if (!isNullorEmpty(zee) || !isNullorEmpty(company_name)) { //stringSet[index - 1].cid != customer_id
                        debtDataSet.push([date, company_name, zee, tot_num, tot_am, overdue, period, note, maap_status]);
                    }
                });
            }
            $('.loading_section').addClass('show');
            var datatable = $('#debt_preview').DataTable();
            datatable.clear();
            datatable.rows.add(debtDataSet);
            datatable.draw();
            $('.loading_section').addClass('hide');
            $('.submit_section').addClass('hide');
            return true;
        }

        function saveRecord() {}

        function invoiceSearch(date_from, date_to) {
            var invoiceResult = search.load({
                id: 'customsearch_debt_coll_inv',
                type: 'invoice',
                filters: [
                    ["type", "anyof", "CustInvc"],
                    "AND", ["mainline", "is", "T"],
                    "AND", ["status", "anyof", "CustInvc:A"],
                    // "AND", ['trandate', 'within', date_from, date_to],
                    "AND", ['trandate', 'before', date_to],
                    "AND", ['trandate', 'after', date_from]
                ]
            });
            result = invoiceResult.run().getRange({
                start: 0,
                end: 1000
            });
            return result;
        }

        function loadingBar(index) {
            $('.loading_bar').val(index);
        }

        /**
         * Function to select Range Options
         */
        function selectRangeOptions() {
            // var rangeArray = rangeSelection();
            var range_filter = $('#range_filter option:selected').map(function() { return $(this).val() });
            range_filter = $.makeArray(range_filter);
            $('#range_filter').selectpicker('val', range_filter);
        }

        /**
         * Sets the values of `date_from` and `date_to` based on the selected option in the '#period_dropdown'.
         */
        function selectDate() {
            var period_selected = $('#period_dropdown option:selected').val();
            var today = new Date();
            var today_day_in_month = today.getDate();
            var today_day_in_week = today.getDay();
            var today_month = today.getMonth();
            var today_year = today.getFullYear();

            switch (period_selected) {
                case "this_week":
                    // This method changes the variable "today" and sets it on the previous monday
                    if (today_day_in_week == 0) {
                        var monday = new Date(Date.UTC(today_year, today_month, today_day_in_month - 6));
                    } else {
                        var monday = new Date(Date.UTC(today_year, today_month, today_day_in_month - today_day_in_week + 1));
                    }
                    var date_from = monday.toISOString().split('T')[0];
                    var date_to = '';
                    break;

                case "last_week":
                    var today_day_in_month = today.getDate();
                    var today_day_in_week = today.getDay();
                    // This method changes the variable "today" and sets it on the previous monday
                    if (today_day_in_week == 0) {
                        var previous_sunday = new Date(Date.UTC(today_year, today_month, today_day_in_month - 7));
                    } else {
                        var previous_sunday = new Date(Date.UTC(today_year, today_month, today_day_in_month - today_day_in_week));
                    }

                    var previous_sunday_year = previous_sunday.getFullYear();
                    var previous_sunday_month = previous_sunday.getMonth();
                    var previous_sunday_day_in_month = previous_sunday.getDate();

                    var monday_before_sunday = new Date(Date.UTC(previous_sunday_year, previous_sunday_month, previous_sunday_day_in_month - 6));

                    var date_from = monday_before_sunday.toISOString().split('T')[0];
                    var date_to = previous_sunday.toISOString().split('T')[0];
                    break;

                case "this_month":
                    var first_day_month = new Date(Date.UTC(today_year, today_month));
                    var date_from = first_day_month.toISOString().split('T')[0];
                    var date_to = '';
                    break;

                case "last_month":
                    var first_day_previous_month = new Date(Date.UTC(today_year, today_month - 1));
                    var last_day_previous_month = new Date(Date.UTC(today_year, today_month, 0));
                    var date_from = first_day_previous_month.toISOString().split('T')[0];
                    var date_to = last_day_previous_month.toISOString().split('T')[0];
                    break;

                case "full_year":
                    var first_day_in_year = new Date(Date.UTC(today_year, 0));
                    var date_from = first_day_in_year.toISOString().split('T')[0];
                    var date_to = '';
                    break;

                case "financial_year":
                    if (today_month >= 6) {
                        var first_july = new Date(Date.UTC(today_year, 6));
                    } else {
                        var first_july = new Date(Date.UTC(today_year - 1, 6));
                    }
                    var date_from = first_july.toISOString().split('T')[0];
                    var date_to = '';
                    break;

                default:
                    var date_from = '';
                    var date_to = '';
                    break;
            }
            $('#date_from').val(date_from);
            $('#date_to').val(date_to);
        }

        /**
         * Create the CSV and store it in the hidden field 'custpage_table_csv' as a string.
         * @param {Array} billsDataSet The `billsDataSet` created in `loadDatatable()`.
         */
        function saveCSV(debtDataSet) {
            var headers = $('#debt_preview').DataTable().columns().header().toArray().map(function(x) { return x.innerText });
            headers = headers.slice(0, headers.length - 1).join(', ');
            var csv = headers + "\n";
            debtDataSet.forEach(function(row) {
                csv += row.join(',');
                csv += "\n";
            });
            // nlapiSetFieldValue('custpage_table_csv', csv);
            return csv;
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
            pageInit: pageInit,
            saveRecord: saveRecord
        }
    }
);