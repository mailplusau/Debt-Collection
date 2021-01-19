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

        function beforeSubmit(){
            $('#submit_section').show();
            $('#submit_section').addClass('show');
            $('#debt_preview').hide();
            $('#debt_preview').addClass('hide');
        }

        function duringSubmit(){
            $('.loading_section').removeClass('hide');
            $('.loading_section').show();
            
            $('#submit_section').addClass('hide');
            $('#submit_section').hide();
            $('#submit_section').remove();

            $('#table_filter_section').removeClass('hide');
            $('#table_filter_section').show();

            if (!isNullorEmpty($('#result_debt').val())){
                $('#debt_preview').removeClass('hide');
                $('#debt_preview').show();
            }

            $('#result_debt').on('change', function(){
                $('#debt_preview').removeClass('hide');
                $('#debt_preview').show();
            });

            $('.result-debt').addClass('hide');
        }

        function afterSubmit(){
            $('.result-debt').removeClass('hide');
            $('#loading_section').addClass('hide');
            $('#loading_section').hide();
            $('#loading_section').remove();

            $('#debt_preview').removeClass('hide');
            $('#debt_preview').show();
        }

        function pageInit() {
            selectRangeOptions();
            beforeSubmit();
     
            debtDataSet = [];
            debt_set = [];
            // $(document).ready(function() {
                var dataTable = $('#debt_preview').DataTable({
                    data: debtDataSet,
                    pageLength: 1000,
                    order: [[8, 'asc']],
                    columns: [
                        { title: 'Date' }, //0
                        { title: 'Invoice Number' }, // 1
                        { title: 'MAAP Bank Account'}, // New 2
                        { title: 'Company Name' }, // 3
                        { title: 'Franchisee' }, // 4
                        {
                            title: 'Total Number of Invoices',
                            type: 'num-fmt'
                        }, // 5
                        {
                            title: 'Invoice Amount',
                            type: 'num-fmt'
                        }, // 6
                        {
                            title: 'Due Date',
                            type: 'num-fmt'
                        }, // 7
                        {
                            title: 'Days Overdue',
                            type: 'num-fmt'
                        }, // 8
                        { title: 'Period' }, // 9
                        { title: 'MP Ticket' }, // 10
                        { title: 'Notes' }, // 11
                        { title: '' }, // 12
                        { title: 'MAAP Payment Status'} // 13
                        // 14 - Customer ID
                        // 15 - Tick Status / This is for the added notes section. Redundent
                        // 16 - Record ID
                        // 17 - Notes
                    ],
                    columnDefs: [{
                            targets: [1, 5, 6, 7],
                            className: 'bolded'
                        },
                        {
                            width: '4%',
                            targets: [5, 6, 7, 8, 9]
                        },
                        {
                            width: '25%',
                            targets: [3, 11]
                        },
                        {
                            width: '10%',
                            targets: 4
                        },
                        {
                            targets: [10, 13, 14, 15, 16, 17],
                            visible: false
                        },
                        {
                            targets: -1,
                            visible: false,
                            searchable: false
                        },
                    ],
                    autoWidth: false,
                    rowCallback: function(row, data) {
                        // $('td:eq(1)', row).html;
                        if (data[13] == 'Payed') {
                            $(row).addClass('maap');
                            if ($(row).hasClass('odd')) {
                                $(row).css('background-color', 'rgba(144, 238, 144, 0.75)'); // LightGreen
                            } else {
                                $(row).css('background-color', 'rgba(152, 251, 152, 0.75)'); // YellowGreen
                            }
                            
                        } else if (parseInt(data[8]) < 60 && parseInt(data[7]) > 30) {
                            //|| data[7] <= '60'
                            if ($(row).hasClass('odd')) {
                                $(row).css('background-color', 'rgba(250, 250, 210, 1)'); // LightGoldenRodYellow
                                $(row).addClass('showWarning')
                            } else {
                                $(row).css('background-color', 'rgba(255, 255, 240, 1)'); // Ivory
                                $(row).addClass('showDanger')
                            }
                        } else if (parseInt(data[8]) >= 60) {
                            if ($(row).hasClass('odd')) {
                                $(row).css('background-color', 'rgba(250, 128, 114, 0.75)'); // Salmon
                                $(row).addClass('showDanger')
                            } else {
                                $(row).css('background-color', 'rgba(255, 0, 0, 0.5)'); // Red
                                $(row).addClass('showDanger')
                            }
                        }
                    }
                });
            // });

            /** 
             *  Submit Button Function
             */
            $('#submit').click(function() {
                // Ajax request
                var fewSeconds = 10;
                var btn = $(this);
                btn.addClass('disabled');
                // btn.addClass('')
                setTimeout(function(){
                    btn.removeClass('disabled');
                }, fewSeconds*1000);

                duringSubmit();
                $('.result-debt').removeClass('hide');
                
                $('#submit_section').hide();
                var range = $('#range_filter').val();
                $('#range_filter').selectpicker();

                var date_from = $('#date_from').val();
                var date_to = $('#date_to').val();
                date_from = dateISOToNetsuite(date_from);
                date_to = dateISOToNetsuite(date_to);
                
                console.log('Load DataTable Params: ' + range + ' | ' + date_from + ' | ' + date_to);

                if (!isNullorEmpty(range) || !isNullorEmpty(date_from) || !isNullorEmpty(date_to)) {
                    // load_record_interval = setInterval(loadDebtRecord, 5000, range, date_from, date_to);
                    loadDebtRecord(range, date_from, date_to);
                } else {
                    error.create({
                        message: 'Please Select Date Range and Date Filter',
                        name: 'Invalid Data'
                    });
                }
                console.log('Loaded Results');

                afterSubmit();

                return true;
            });

            /** 
             * Table Filters Section
             */
            // MP Ticket Column
            $(document).on('click', '.toggle-mp-ticket', function (e){
                e.preventDefault();
                // Get the column API object
                var column = dataTable.column(10);
                // Toggle the visibility
                column.visible(!column.visible());
                if (column.visible() == true){
                    $(this).addClass('btn-danger');
                    $(this).removeClass('btn-success');
                    $(this).find('.span_class').addClass('glyphicon-minus');
                    $(this).find('.span_class').removeClass('glyphicon-plus');
                } else {
                    $(this).removeClass('btn-danger');
                    $(this).addClass('btn-success');
                    $(this).find('.span_class').removeClass('glyphicon-minus');
                    $(this).find('.span_class').addClass('glyphicon-plus');
                }
            });

            // Matching MAAP Allocation Column
            $(document).on('click', '.toggle-maap', function (e){
                e.preventDefault();

                $.fn.dataTable.ext.search.pop('');
                dataTable.draw();
            });
            $(document).on('click', '.toggle-maap-danger', function (e){
                e.preventDefault();

                $(this).toggleClass('btn-success');
                    $(this).toggleClass('btn-danger');
                    $(this).find('.span_class').toggleClass('glyphicon-plus');
                    $(this).find('.span_class').toggleClass('glyphicon-minus');

                if ($(this).find('btn-danger')){
                    $.fn.dataTable.ext.search.push(
                        function(settings, searchData, index, rowData, counter) {
                            if (rowData[13] == 'Not Payed'){
                                return true;
                            }
                            return false;
                        }
                    );  
                    dataTable.draw();
                }
            });

            // MAAP Bank Account Column
            $(document).on('click', '.toggle-maap-bank', function (e){
                e.preventDefault();
                // Get the column API object
                var column = dataTable.column(2);
                // Toggle the visibility
                column.visible(!column.visible());
                $(this).toggleClass('btn-success');
                $(this).toggleClass('btn-danger');
                $(this).find('.span_class').toggleClass('glyphicon-plus');
                $(this).find('.span_class').toggleClass('glyphicon-minus');
            });

            if (!isNullorEmpty($('#period_dropdown option:selected').val())) {
                selectDate();
            }
            $('#period_dropdown').change(function() {
                selectDate();
            });

            // $(document).on('click', '.toggle-priority', function (e){
            //     e.preventDefault();

            //     if ($(this).find('btn-danger')){
            //         $.fn.dataTable.ext.search.push(
            //             function(settings, searchData, index, rowData, counter) {
            //                 if (rowData[7] >= '60'){
            //                     return true; 
            //                 }
            //                 return false;
            //             }
            //         );
            //         dataTable.draw();
            //     }
            // });

            // $(document).on('click', '.toggle-priority-danger', function (e){
            //     e.preventDefault();
                  
            //     $.fn.dataTable.ext.search.pop('');
            //     dataTable.draw();
            // });

            /**
             *  Notes Section
             */
            // More Notes Option
            $(document).on('click', '.note', function() {
                var tr = $(this).closest('tr');
                var row = dataTable.row(tr);
                console.log(row.data());
                var index = row.data();

                var invoiceNumber = (index[1].split('id=')[1]).split('">')[0];
                console.log("Invoice Number: " + invoiceNumber);
                var noteInfo = index[17];
                var customer_id = index[14];
                console.log('NOTES Section: ID - ' + customer_id + '  :' + noteInfo);

                var invoiceNumber = (index[1].split('id=')[1]).split('">')[0];

                var note_filter = search.createFilter({
                    name: 'title',
                    operator: search.Operator.CONTAINS,
                    values: 'Debt Collection _ ' + invoiceNumber
                });
                var noteSearch = search.load({
                    id: 'customsearch_debt_coll_note',
                    type: 'note'
                });
                noteSearch.filters.push(note_filter);
                var noteResults = noteSearch.run();

                var header = '<div><h3><label class="control-label">Notes Section</label></h3></div>';
                var body = '';
                
                var bodyNoteOld = '<div /*class="col col-lg-9"*/ id="oldnote"><h3 style="color: rgb(50, 122, 183);">Previous Notes</h3>';
                var bodyNoteNew = '<div /*class="col-lg-9"*/ id="newnote"><h3 style="color: rgb(50, 122, 183);">Previously Edited</h3>';

                if (!isNullorEmpty(noteResults)){
                    noteResults.each(function(noteSet, index) {
                        var note_name = noteSet.getValue({
                            name: 'title'
                        });
                        var note_id = noteSet.getValue({
                            name: 'internalid'
                        });
                        log.audit({
                            title: 'User Note ID',
                            details: note_id
                        })
                        log.audit({
                            title: 'User Note Details',
                            details: note_name
                        });
                        var oldNote = noteSet.getValue({
                            name: 'note'
                        });
                        var author = noteSet.getValue({
                            name: 'author'
                        })
                        console.log('Old Notes Info: ' + oldNote);
                        bodyNoteOld += '<textarea id="note_id_' + note_id + '" class="form-control note_old">' + oldNote + '</textarea>';
                        bodyNoteNew += '<h2>' + author + '</h2>';
                    });
                } else {
                    bodyNoteOld += '<h2>Currently No Notes Have Been Created For This Customer</h2>';
                    bodyNoteNew += '<h2>No Team Member</h2>';
                }                
                bodyNoteOld += '</div>';
                bodyNoteNew += '</div>'; 
                
                body += bodyNoteOld;
                body += bodyNoteNew;

                $('#myModal .modal-header').html(header);
                $('#myModal .modal-body').html("");
                $('#myModal .modal-body').html(body);
                $('#myModal').modal("show");
            });

            // Notes Input and Submit
            $(document).on('click', '.tickbox', function() {
                var tr = $(this).closest('tr');
                var row = dataTable.row(tr);
                var index = row.data();
                var tick_status = index[15];
                var custid = (index[14]);
                var noteVal = $('#note_' + custid).val();
                console.log("Note Value: " + noteVal);

                if (!isNullorEmpty(noteVal)){
                    if ($(this).find('btn-warning') || tick_status == 'true'){
                        // If Closed
                        $(this).addClass('btn-success');
                        $(this).removeClass('btn-warning');
                        $(this).find('.span_class').addClass('glyphicon-ok');
                        $(this).find('.span_class').removeClass('glyphicon-plus');
                        
                    } else {
                        // If Opened
                        $(this).removeClass('btn-success');
                        $(this).addClass('btn-warning');
                        $(this).find('.span_class').removeClass('glyphicon-ok');
                        $(this).find('.span_class').addClass('glyphicon-plus');
                    }

                    onclick_noteSection(row.data(), custid, noteVal);

                } else {
                    console.log('Notes Section - ID: ' + index[14] + '. Message missing');
                    error.create({
                        message: 'Notes Section Empty. Please fill this before submitting',
                        name: 'Error - notes',
                        notifyOff: false
                    });
                }
            }); 
        }

        function onclick_noteSection(index, custid, noteVal) {
            console.log("Cust Id From Input Field: " + custid);
            
            var record_value = index[16];
            console.log('record Value: ' + record_value);

            var initials = userName.split(' ').map(function (n) {return n[0]}).join(".");
            var newNote = initials + ' - ' + getDate().toString() + ' ' + formatAMPM() + ': ' + noteVal;
            
            var invoiceNumber = (index[1].split('id=')[1]).split('">')[0];
            console.log("Invoice Number: " + invoiceNumber);
            var noteInfo = index[17];

            var note_filter = search.createFilter({
                name: 'title',
                operator: search.Operator.IS,
                values: 'Debt Collection _ ' + invoiceNumber
            });
            var noteSearch = search.load({
                id: 'customsearch_debt_coll_note',
                type: 'note'
            });
            noteSearch.filters.push(note_filter);
            var noteResults = noteSearch.run().getRange({ start: 0, end: 1});

            if (!isNullorEmpty(noteResults)){
                noteResults.forEach(function(noteResult){  
                    
                    // Load User Note and Save onto User Note record  
                    var noteID = noteResult.getValue({
                        name: 'internalid'
                    });
                    console.log('User note Found: ' + noteID);
                    var userNoteRecord = record.load({
                        type: 'note',
                        id: noteID
                    });
                    if (!isNullorEmpty(noteInfo)){
                        var userNote = userNoteRecord.setValue({
                            fieldId: 'note',
                            value: noteInfo + '\n' + newNote
                        });
                    } else {
                        var userNote = userNoteRecord.setValue({
                            fieldId: 'note',
                            value: newNote
                        });
                    }
                    if (!isNullorEmpty(userNote)){
                        userNoteRecord.save();
                    }
                });
            } else {
                console.log('USer Note not found. Creating New One')
                //Create new User Note and Save on record.
                var userNoteRecord = record.create({
                    type: 'note'
                });
                userNoteRecord.setValue({
                    fieldId: 'title',
                    value: 'Debt Collections _ ' + invoiceNumber
                });
                userNoteRecord.setValue({
                    fieldId: 'entity',
                    value: custid
                });
                userNoteRecord.setValue({
                    fieldId: 'author',
                    value: runtime.getCurrentUser().id
                });
                // userNoteRecord.setValue({
                //     fieldId: 'entity',
                //     value: custid
                // });
                var initialFormattedDateString = getDate().toString();
                var parsedDateStringAsRawDateObject = format.parse({ value: initialFormattedDateString, type: format.Type.DATE });
                userNoteRecord.setValue({
                    fieldId: 'notedate',
                    value: parsedDateStringAsRawDateObject
                });
                if (!isNullorEmpty(noteInfo)){
                    var userNote = userNoteRecord.setValue({
                        fieldId: 'note',
                        value: noteInfo + '\n' + newNote
                    });
                } else {
                    var userNote = userNoteRecord.setValue({
                        fieldId: 'note',
                        value: newNote
                    });
                }
                if (!isNullorEmpty(userNote)){
                    userNoteRecord.save();
                } 
            }

            // Load Note from Debt Coll Record and Set as New Note Value
            var tickRecord = record.load({
                type: 'customrecord_debt_coll_inv',
                id: record_value
            });
            if (!isNullorEmpty(noteInfo)){ // For invoices already containing a note
                var tick_note = tickRecord.setValue({
                    value: noteInfo + '\n' + newNote,
                    fieldId: 'custrecord_debt_coll_inv_note'
                });
            } else {
                var tick_note = tickRecord.setValue({
                    value: newNote,
                    fieldId: 'custrecord_debt_coll_inv_note'
                });
            }
            tick_status = tickRecord.setValue({
                value: 'true',
                fieldId: 'custrecord_debt_coll_inv_note_status'
            });
            if (!isNullorEmpty(tick_note)){
                var tickRecSave = tickRecord.save();
            }
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
            // var date_from_Filter = ['custrecord_debt_coll_inv_date', search.Operator.ONORAFTER, date_from];
            // var date_to_Filter = ['custrecord_debt_coll_inv_date', search.Operator.ONORBEFORE, date_to];
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
                
                // if (selector_id == '1') {
                //     console.log('MPEX Products Selected');
                //     var myFilter1 = ['custrecord_debt_coll_inv_range', 'contains', 1]
                // } else {
                //     var myFilter1 = [];
                // }
                // if (selector_id == '2') {
                //     console.log('0 - 59 Days Selected');
                //     var myFilter2 = ['custrecord_debt_coll_inv_range', 'contains', 2];
                // } else {
                //     var myFilter2 = [];
                // }
                // if (selector_id == '3') {
                //     console.log('60+ Days Selected');
                //     var myFilter3 = ['custrecord_debt_coll_inv_range', 'contains', 3];
                // } else {
                //     var myFilter3 = [];
                // }
            }
            var secure_cash_filter = search.createFilter({
                name: 'custrecord_debt_coll_inv_cust_name',
                operator: search.Operator.DOESNOTCONTAIN,
                values: 'Secure Cash'
            });
            var neopost_filter = search.createFilter({
                name: 'custrecord_debt_coll_inv_cust_name',
                operator: search.Operator.DOESNOTCONTAIN,
                values: 'NP'
            });
            // var filterExpression = [[date_from_Filter, 'AND', date_to_Filter], 'AND', [myFilter1, 'OR', myFilter2, 'OR', myFilter3]];
            var invoiceResults = search.load({
                type: 'customrecord_debt_coll_inv',
                id: 'customsearch_debt_coll_table'
                // filters: filterExpression,
                // columns: [
                //     search.createColumn({name: "name", label: "Name"}),
                //     search.createColumn({name: "custrecord_debt_coll_inv_range", label: "Debt Coll - Range ID"}),
                //     search.createColumn({name: "custrecord_debt_coll_inv_id", label: "Debt Coll - Invoice ID"}),
                //     search.createColumn({name: "custrecord_debt_coll_inv_name", label: "Debt Coll - Invoice Name"}),
                //     search.createColumn({
                //        name: "custrecord_debt_coll_inv_date",
                //        sort: search.Sort.DESC,
                //        label: "Debt Coll - Date "
                //     }),
                //     search.createColumn({name: "custrecord_debt_coll_inv_cust_id", label: "Debt Coll - Customer ID"}),
                //     search.createColumn({name: "custrecord_debt_coll_inv_cust_name", label: "Debt Coll - Customer Name"}),
                //     search.createColumn({name: "custrecord_debt_coll_inv_zee_id", label: "Debt Coll - Franchisee ID"}),
                //     search.createColumn({name: "custrecord_debt_coll_inv_tot_am", label: "Debt Coll - Total Amount"}),
                //     search.createColumn({name: "custrecord_debt_coll_inv_overdue", label: "Debt Coll - Overdue"}),
                //     search.createColumn({name: "custrecord_debt_coll_inv_due_date", label: "Debt Coll - Due Date"}),
                //     search.createColumn({name: "custrecord_debt_coll_inv_period", label: "Debt Coll - Period"}),
                //     search.createColumn({name: "custrecord_debt_coll_inv_mp_ticket", label: "Debt Coll - MP Ticket"}),
                //     search.createColumn({name: "custrecord_debt_coll_inv_note", label: "Debt Coll - Note"}),
                //     search.createColumn({name: "custrecord_debt_coll_inv_status", label: "Debt Coll - MAAP Status"}),
                //     search.createColumn({
                //        name: "internalid",
                //        sort: search.Sort.ASC,
                //        label: "Internal ID"
                //     })
                //  ]
            });
            invoiceResults.filters.push(date_to_Filter);
            invoiceResults.filters.push(date_from_Filter);
            invoiceResults.filters.push(secure_cash_filter);
            invoiceResults.filters.push(neopost_filter);
            if (!isNullorEmpty(myFilter1)) { invoiceResults.filters.push(myFilter1); }
            if (!isNullorEmpty(myFilter2)) { invoiceResults.filters.push(myFilter2); }
            if (!isNullorEmpty(myFilter3)) { invoiceResults.filters.push(myFilter3); }
            var invResultRun = invoiceResults.run();
            
            var invResultSet = [];
            var main_index = 0;
            for (var main_index = 0; main_index < 10000; main_index += 1000){
                invResultSet.push(invResultRun.getRange({start: main_index, end: main_index + 999}));
            }
            // console.log(JSON.stringify(invResultSet));
            if (!isNullorEmpty(invResultSet)) {
                for (var i = 0; i < invResultSet.length; i++){
                    invResultSet[i].forEach(function(invoiceSet, index) {
                        var recID = invoiceSet.getValue({ 
                            name: 'internalid'
                        });
                        var invoice_id = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_id'
                        });
                        var date = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_date'
                        });
                        var invoice_name = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_name'
                        });
                        var maap_bank = invoiceSet.getValue({
                            name: 'custrecord_debt_inv_maap_bank'
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
                        var tick_status = invoiceSet.getValue({
                            name: 'custrecord_debt_coll_inv_note_status'
                        });
                        
                        if (!isNullorEmpty(zee_name) || !isNullorEmpty(customer_name)) {
                            debt_set.push({
                                dt: date,// 0
                                inid: invoice_id, //1
                                in: invoice_name, // 2
                                mba: maap_bank,
                                cid: customer_id,
                                cm: customer_name,
                                zee: zee_name,
                                ta: total_amount,
                                od: overdue,
                                dd: due_date,
                                p: period,
                                nt: note,
                                mp: mp_ticket,
                                ms: maap_status,
                                ts: tick_status,
                                id: recID
                            });
                        }
                        return true;
                    });
                }
                // console.log('Data Set: ' + JSON.stringify(debt_set));
                loadDatatable(debt_set);
                debt_set = [];
            } else {
                console.log('Results Empty');
            }
        }

        function loadDatatable(debt_rows) {
            // $('#result_debt').empty();
            debtDataSet = [];
            if (!isNullorEmpty(debt_rows)) {
                debt_rows.forEach(function(debt_row, index) {
                    var count = 0;
                    var dateValue = debt_row.dt
                    var date_split = dateValue.split("/") //when date is entered in DD/MM/YYYY format. We split days months and year
                    if (date_split[0].length == 1){
                        var days = '0' + date_split[0]; //get DD
                        var month = date_split[1]; //get MM
                        var year = date_split[2]; //get YYYY
                        var date = days + '/' + month + '/' + year;
                    } else {
                        var date = dateValue;
                    }
                    var invoice_id = debt_row.inid;
                    var invoice_name = debt_row.in;
                    var upload_url_inv = '/app/accounting/transactions/custinvc.nl?id=';
                    var invoice = '<a href="' + baseURL + upload_url_inv + invoice_id + '">' + invoice_name + '</a>';
                    var maap_bank = debt_row.mba;
                    var customer_id = debt_row.cid;
                    var cm_link = debt_row.cm;
                    var params = {
                        custid: customer_id,
                        scriptid: 'customscript_sl_customer_list',
                        deployid: 'customdeploy_sl_customer_list'
                    }
                    params = JSON.stringify(params);
                    var upload_url_cust = '/app/common/entity/custjob.nl?id=';
                    var company_name = '<a href="' + baseURL + upload_url_cust + customer_id + '">' + cm_link + '</a>';
                    var zee = debt_row.zee;
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
                    if (isNullorEmpty(noteInfo)){ // If there is no note, then disable button.
                        var note = '<div class="col-xs-3"><button type="button" class="form-control btn-xs btn-secondary note disabled" data-toggle="modal" data-target="#myModal"><span class="glyphicon glyphicon-eye-open"></span></button></div>';
                    } else {
                        var note = '<div class="col-xs-3"><button type="button" class="form-control btn-xs btn-secondary note" data-toggle="modal" data-target="#myModal"><span class="glyphicon glyphicon-eye-open"></span></button></div>';
                    } 
                    note += '<div class="col-xs-9"><input id="note_' + customer_id + '" class="form-control note_section"/></div>'; //value="' + noteInfo + '"
                    var checkbox = '<button type="button" id="tickbox_' + customer_id + '" class="tickbox form=control btn-xs btn-warning"><span class="span_class glyphicon glyphicon-plus"></span></button>';
                    var mp_ticket = debt_row.mp
                    var maap_status = debt_row.ms;
                    var tick_status = debt_row.ts;
                    var record_id = debt_row.id;

                    if (!isNullorEmpty(zee) || !isNullorEmpty(company_name)) {
                        debtDataSet.push([date, invoice, maap_bank, company_name, zee, tot_num, tot_am, due_date, overdue, period, mp_ticket, note, checkbox, maap_status, customer_id, tick_status, record_id, noteInfo]);
                    }
                });
            }
            var datatable = $('#debt_preview').DataTable();
            datatable.clear();
            datatable.rows.add(debtDataSet);
            datatable.draw();
            // clearInterval(load_record_interval);
            return true;
        }

        function saveRecord() {}
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

            var today_date = new Date(Date.UTC(today_year, today_month, today_day_in_month))
            
            switch (period_selected) {
                case "this_week":
                    // This method changes the variable "today" and sets it on the previous monday
                    if (today_day_in_week == 0) {
                        var monday = new Date(Date.UTC(today_year, today_month, today_day_in_month - 6));
                    } else {
                        var monday = new Date(Date.UTC(today_year, today_month, today_day_in_month - today_day_in_week + 1));
                    }
                    var date_from = monday.toISOString().split('T')[0];
                    var date_to = today_date.toISOString().split('T')[0];
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
                    var date_to = today_date.toISOString().split('T')[0];
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
                    var date_to = today_date.toISOString().split('T')[0];
                    break;

                case "financial_year":
                    if (today_month >= 6) {
                        var first_july = new Date(Date.UTC(today_year, 6));
                    } else {
                        var first_july = new Date(Date.UTC(today_year - 1, 6));
                    }
                    var date_from = first_july.toISOString().split('T')[0];
                    var date_to = today_date.toISOString().split('T')[0];
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

        function formatAMPM() {
            var date = new Date();
            var hours = date.getHours();
            var minutes = date.getMinutes();
            var ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0'+minutes : minutes;
            var strTime = hours + ':' + minutes + ' ' + ampm;
            return strTime;
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