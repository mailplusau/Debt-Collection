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

define(['N/email', 'N/runtime', 'N/search', 'N/record', 'N/http', 'N/log', 'N/error', 'N/url', 'N/format', 'N/currentRecord'],
    function(email, runtime, search, record, http, log, error, url, format, currentRecord) {
        var zee = 0;
        var role = 0;

        var baseURL = 'https://1048144.app.netsuite.com';
        if (runtime.EnvType == "SANDBOX") {
            baseURL = 'https://1048144-sb3.app.netsuite.com';
        }

        role = runtime.getCurrentUser().role;
        var userName = runtime.getCurrentUser().name;
        var currRec = currentRecord.get();

        if (role == 1000) {
            zee = runtime.getCurrentUser().id;
        } else if (role == 3) { //Administrator
            zee = 6; //test
        } else if (role == 1032) { // System Support
            zee = 425904; //test-AR
        }

        var debtDataSet = JSON.parse(JSON.stringify([]));
        var debt_set = JSON.parse(JSON.stringify([]));
        var load_record_interval;

        function pageInit() {
            selectRangeOptions();
            $('#submit_section').show();
            $('#debt_preview').hide();

            // function submit() {
            $('#submit').click(function() {
                $('#submit_section').hide();
                // $('#load_section').hide();
                debtDataSet = [];
                debt_set = [];
                // $(document).ready(function() {
                $('#debt_preview').DataTable({
                    data: debtDataSet,
                    pageLength: 1000,
                    columns: [
                        { title: 'Date' },
                        { title: 'Invoice Number' },
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
                            title: 'Due Date',
                            type: 'num-fmt'
                        },
                        {
                            title: 'Days Overdue',
                            type: 'num-fmt'
                        },
                        { title: 'Period' },
                        { title: 'MP Ticket' },
                        { title: 'Notes' },
                        { title: '' },
                        { title: 'MAAP Payment Status' }
                    ],
                    columnDefs: [{
                            targets: [1, 4, 5, 6],
                            className: 'bolded'
                        },
                        {
                            width: '5%',
                            targets: [4, 5, 6, 7, 8]
                        },
                        {
                            width: '30%',
                            targets: [2, 10]
                        },
                        {
                            width: '15%',
                            targets: 3
                        },
                        {
                            targets: 12,
                            visible: false
                        },
                        {
                            targets: -1,
                            visible: false,
                            searchable: false
                        },
                    ],
                    rowCallback: function(row, data) {
                        // $('td:eq(1)', row).html;
                        if (data[12] == 'Payed') {
                            if ($(row).hasClass('odd')) {
                                $(row).css('background-color', 'rgba(144, 238, 144, 0.75)'); // LightGreen
                            } else {
                                $(row).css('background-color', 'rgba(152, 251, 152, 0.75)'); // YellowGreen
                            }
                        } else if (data[7] < '60') { //|| data[7] <= '60'
                            if ($(row).hasClass('odd')) {
                                $(row).css('background-color', 'rgba(250, 250, 210, 1)'); // LightGoldenRodYellow
                            } else {
                                $(row).css('background-color', 'rgba(255, 255, 240, 1)'); // Ivory
                            }
                        } else if (data[7] >= '60') {
                            if ($(row).hasClass('odd')) {
                                $(row).css('background-color', 'rgba(250, 128, 114, 0.75)'); // Salmon
                            } else {
                                $(row).css('background-color', 'rgba(255, 0, 0, 0.5)'); // Red
                            }
                        }
                        // else if (data[9] == 'Not Payed') {
                        //     if ($(row).hasClass('odd')) {
                        //         $(row).css('background-color', 'LightGoldenRodYellow');
                        //     } else {
                        //         $(row).css('background-color', 'Ivory')
                        //     }
                        // }
                    }
                });

                $('#debt_preview').show();

                var range = $('#range_filter').val();
                // var range = JSON.parse(currRec.getValue({ fieldId: 'custscript_debt_inv_range' }));
                // var date_from = currRec.getValue({ fieldId: 'custscript_debt_inv_date_from' });
                // var date_to = currRec.getValue({ fieldId: 'custscript_debt_inv_date_to' });
                // date_from = dateISOToNetsuite(date_from);
                // date_to = dateISOToNetsuite(date_to);
                // $('#date_from').val(date_from_iso);
                // $('#date_to').val(date_to_iso);
                var date_from = $('#date_from').val();
                var date_to = $('#date_to').val();
                date_from = dateISOToNetsuite(date_from);
                date_to = dateISOToNetsuite(date_to);


                $('#range_filter').selectpicker();

                console.log('Load DataTable Params: ' + range + ' | ' + date_from + ' | ' + date_to);

                if (!isNullorEmpty(range) || !isNullorEmpty(date_from) || !isNullorEmpty(date_to)) {
                    // if (is_params == 'T') {
                    // loadDebtRecord(range, date_from, date_to);
                    load_record_interval = setInterval(loadDebtRecord, 5000, range, date_from, date_to);
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
            // }

            // $('.note').on('click', function() {
            //     // console.log((this.id).split('_')[1]);
            //     // onclick_noteSection();
            //     console.log('CLICKED!');
            // });
            $('.note').on('click', '', function() {
                console.log('textContent: ', this.id);
            });

            if (!isNullorEmpty($('#period_dropdown option:selected').val())) {
                selectDate();
            }
            $('#period_dropdown').change(function() {
                selectDate();
            });
        }

        // function hideLoading() {
        //     $('#debt_preview').hide();
        //     $('#load_section').hide();
        // }

        // function showResults() {
        //     $('#debt_preview').show();
        //     $('#load_section').show();
        // }

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

        function loadDebtRecord(range, date_from, date_to) {
            var date_from_Filter = search.createFilter({
                name: 'custrecord_debt_coll_inv_date',
                operator: search.Operator.ONORAFTER,
                values: date_from
            });
            var date_to_Filter = search.createFilter({
                name: 'custrecord_debt_coll_inv_date',
                operator: search.Operator.ONORBEFORE,
                values: date_to
            });
            for (var i = 0; i < JSON.parse(range.length); i++) {
                console.log('Range ID: ' + JSON.parse(range[i]));
                var selector_id = JSON.parse(range[i]);
                if (selector_id == '1') {
                    console.log('MPEX Products Selected');
                    var myFilter1 = search.createFilter({
                        name: 'custrecord_debt_coll_inv_range',
                        operator: search.Operator.CONTAINS,
                        values: 1
                    });
                }
                if (selector_id == '2') {
                    console.log('0 - 59 Days Selected');
                    var myFilter2 = search.createFilter({
                        name: 'custrecord_debt_coll_inv_range',
                        operator: search.Operator.CONTAINS,
                        values: 2
                    });
                }
                if (selector_id == '3') {
                    console.log('60+ Days Selected');
                    var myFilter3 = search.createFilter({
                        name: 'custrecord_debt_coll_inv_range',
                        operator: search.Operator.CONTAINS,
                        values: 3
                    });
                }
            }
            var invoiceResults = search.load({
                type: 'customrecord_debt_coll_inv',
                id: 'customsearch_debt_coll_table'
            });
            invoiceResults.filters.push(date_to_Filter);
            invoiceResults.filters.push(date_from_Filter);
            if (!isNullorEmpty(myFilter1)) { invoiceResults.filters.push(myFilter1); }
            if (!isNullorEmpty(myFilter2)) { invoiceResults.filters.push(myFilter2); }
            if (!isNullorEmpty(myFilter3)) { invoiceResults.filters.push(myFilter3); }
            var invResultRun = invoiceResults.run();

            // var date_filter = ['custrecord_debt_coll_inv_date', 'within', date_from, date_to]
            // for (var i = 0; i < JSON.parse(range.length); i++) {
            //     console.log('Range ID: ' + JSON.parse(range[i]));
            //     var selector_id = JSON.parse(range[i]);
            //     if (selector_id == '1') {
            //         console.log('MPEX Products Selected');
            //         var myFilter1 = ['custrecord_debt_coll_inv_range', 'contains', 1]
            //     }
            //     if (selector_id == '2') {
            //         console.log('0 - 59 Days Selected');
            //         var myFilter2 = ['custrecord_debt_coll_inv_range', 'contains', 2]
            //     }
            //     if (selector_id == '3') {
            //         console.log('60+ Days Selected');
            //         var myFilter3 = ['custrecord_debt_coll_inv_range', 'contains', 3]
            //     }
            // }
            // var invoiceResults = search.load({
            //     type: 'customrecord_debt_coll_inv',
            //     id: 'customsearch_debt_coll_table',
            //     columns: [search.createColumn({
            //         name: "custrecord_debt_coll_inv_date",
            //         sort: search.Sort.DESC,
            //         label: "Debt Coll - Date "
            //      }), search.createColumn({name: "custrecord_debt_coll_inv_range", label: "Debt Coll - Range ID"})],
            //     filters: [
            //         date_filter, 'AND', [myFilter1, 'OR', myFilter2, 'OR', myFilter3]
            //     ]
            // });
            // var invResultRun = invoiceResults.run();
            
            var invResultSet = [];
            var main_index = 0;
            for (var main_index = 0; main_index < 10000; main_index += 1000){
                invResultSet.push(invResultRun.getRange({start: main_index, end: main_index + 999}));
            }
            console.log(JSON.stringify(invResultSet));

            if (!isNullorEmpty(invResultSet)) {
                for (var i = 0; i < invResultSet.length; i++){
                    invResultSet[i].forEach(function(invoiceSet, index) {
                        var invoice_id = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_id'
                        });
                        var date = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_date'
                        });
                        var invoice_name = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_name'
                        });
                        var customer_id = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_cust_id'
                        });
                        var customer_name = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_cust_name'
                        });
                        var zee_name = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_zee_id'
                        });
                        var total_amount = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_tot_am'
                        });
                        var overdue = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_overdue'
                        });
                        var due_date = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_due_date'
                        });
                        var period = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_period'
                        });
                        var note = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_note'
                        });
                        var mp_ticket = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_mp_ticket',
                        });
                        var maap_status = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_status'
                        });

                        if (!isNullorEmpty(zee_name) || !isNullorEmpty(customer_name)) {
                            debt_set.push({
                                dt: date,
                                inid: invoice_id,
                                in: invoice_name,
                                cid: customer_id,
                                cm: customer_name,
                                zee: zee_name,
                                ta: total_amount,
                                od: overdue,
                                dd: due_date,
                                p: period,
                                nt: note,
                                mp: mp_ticket,
                                ms: maap_status
                            });
                        }
                        return true;
                    });
                }
                console.log('Data Set: ' + JSON.stringify(debt_set));
                loadDatatable(debt_set);
                debt_set = [];
            } else {
                console.log('Results Empty');
            }
        }

        function loadDatatable(debt_rows) {
            $('#result_debt').empty();
            debtDataSet = [];
            if (!isNullorEmpty(debt_rows)) {
                debt_rows.forEach(function(debt_row, index) {
                    var count = 0;
                    var date = debt_row.dt
                    var invoice_id = debt_row.inid;
                    var invoice_name = debt_row.in;
                    var upload_url_inv = '/app/accounting/transactions/custinvc.nl?id=';
                    var invoice = '<a href="' + baseURL + upload_url_inv + invoice_id + '">' + invoice_name + '</a>';
                    var customer_id = debt_row.cid;
                    var cm_link = debt_row.cm;
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
                    var upload_url_cust = '/app/common/entity/custjob.nl?id=';
                    var company_name = '<a href="' + baseURL + upload_url_cust + customer_id + '">' + cm_link + '</a>';

                    var zee = debt_row.zee;
                    // for (var i = 0; i < debt_rows.length; i++){
                    //     var customerID = debt_rows[i].cid;
                    //     if (customerID == customer_id){
                    //         count++;
                    //     }
                    // }
                    var amount = parseFloat(debt_row.ta);
                    debt_rows.forEach(function(debt) {
                        var cust_name = debt.cm;
                        // if (debt.indexOf(cust_name) > 1 && debt_row.indexOf(cust_name) === -1){
                        if (cust_name == cm_link) {
                            count++;
                            // amount += parseFloat(debt.ta);
                        }
                    });
                    var tot_num = count;
                    var tot_am = amount;
                    tot_am = financial(tot_am);

                    var due_date = debt_row.dd;
                    var overdue = debt_row.od;
                    var period = debt_row.p;

                    var noteInfo = debt_row.nt;
                    var note = '<input id="note_' + customer_id + '" value="' + noteInfo + '" class="form-control note"/>';
                    $('.note').on('click', function() {
                        // console.log((this.id).split('_')[1]);
                        // onclick_noteSection();
                        console.log('CLICKED!');
                    });
                    var checkbox = '<input type="checkbox" id="check_' + customer_id + '" name="check" value="Complete" class="form-check-input check_' + customer_id + '"/>'
                    var mp_ticket = debt_row.mp
                    var maap_status = debt_row.ms;

                    if (!isNullorEmpty(zee) || !isNullorEmpty(company_name)) { //stringSet[index - 1].cid != customer_id
                        debtDataSet.push([date, invoice, company_name, zee, tot_num, tot_am, due_date, overdue, period, mp_ticket, note, checkbox, maap_status]);
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
            clearInterval(load_record_interval);

            return true;
        }

        function saveRecord() {}

        function loadingBar(index) {
            $('.loading_bar').val(index);
        }

        function updateProgressBar(resultSetLength) {
            if (!isNullorEmpty()) {
                try {
                    console.log("Nb records left to move : ", nb_records_left_to_move);
                    if (result_length == 0) {
                        $('#progress-records').attr('class', 'progress-bar progress-bar-success');
                    }

                    var nb_records_moved = resultSetLength - nb_records_left_to_move;
                    var width = parseInt((nb_records_moved / resultSetLength) * 100);

                    $('#progress-records').attr('aria-valuenow', nb_records_moved);
                    $('#progress-records').attr('style', 'width:' + width + '%');
                    $('#progress-records').text('Barcodes records reallocated : ' + nb_records_moved + ' / ' + resultSetLength);
                    console.log("nb_records_moved : ", nb_records_moved);
                    console.log("width : ", width);
                } catch (e) {
                    if (e instanceof error) {
                        if (e.getCode() == 'SCRIPT_EXECUTION_USAGE_LIMIT_EXCEEDED') {

                        }
                    }
                }
            }
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
                    var date_to = getDate();
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
                    var date_to = getDate();
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
                    var date_to = getDate();
                    break;

                case "financial_year":
                    if (today_month >= 6) {
                        var first_july = new Date(Date.UTC(today_year, 6));
                    } else {
                        var first_july = new Date(Date.UTC(today_year - 1, 6));
                    }
                    var date_from = first_july.toISOString().split('T')[0];
                    var date_to = getDate();
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
    });