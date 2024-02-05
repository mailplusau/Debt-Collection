/**
 * 
 * @NApiVersion 2.0
 * @NScriptType ClientScript
 * 
 * Description: 
 * @Last Modified by: Anesu Chakaingesu
 * 
 */

define(['N/error', 'N/runtime', 'N/search', 'N/url', 'N/record', 'N/format', 'N/email', 'N/currentRecord'],
    function (error, runtime, search, url, record, format, email, currentRecord) {
        var zee = 0;
        var role = 0;

        var baseURL = 'https://1048144.app.netsuite.com';
        if (runtime.EnvType == "SANDBOX") {
            baseURL = 'https://1048144-sb3.app.netsuite.com';
        }

        role = runtime.getCurrentUser().role;
        var userName = runtime.getCurrentUser().name;
        var userId = runtime.getCurrentUser().id;
        var currRec = currentRecord.get();

        if (role == 1000) {
            zee = runtime.getCurrentUser().id;
        } else if (role == 3) { //Administrator
            zee = 6; //test
        } else if (role == 1032) { // System Support
            zee = 425904; //test-AR
        }



        /**
         * On page initialisation
         */
        function pageInit() {
            // Background-Colors
            $("#NS_MENU_ID0-item0").css("background-color", "#CFE0CE");
            $("#NS_MENU_ID0-item0 a").css("background-color", "#CFE0CE");
            $("#body").css("background-color", "#CFE0CE");
            $("#tr_submitter").css("margin-left", "10px");

            // // Hide Netsuite Submit Button
            $('#submitter').css("background-color", "#CFE0CE");
            $('#submitter').hide();
            $('#tbl_submitter').hide();

            selectMemberOptions();
            selectTeamOptions();

            if (!isNullorEmpty($('#period_dropdown option:selected').val())) {
                selectDate();
            }
            $('#period_dropdown').change(function () {
                selectDate();
            });

            /**
             *  Re-Arrange
             *  Workflow:
             *  
             *  On Change of DropDown $('.rearrange')
             *  Get Values from Dropdown & Split string names into an array
             *  Push each array name into textbox field. 
             *  
             *  On Click of Submit
             *  Pass dropdown values
             *  Save on CurrRec
             *  Load SS mp_ss_debt_coll_assign
             * 
             */

            $('#team_filter').change(function () {
                var val = $(this).val();
                var text = $(this).text();

                console.log('Val: ' + val);

                var text_array = text.split(',');
                // var id_array = val.split(",");
                // for (var i; i < text_array.length; i++) {
                //     var emp_name = text_array[i];
                //     var emp_id = id_array[i]

                //     input_field += '<input class="rearrage_table" id=' + emp_id + '>' + emp_name + '</input>';
                // }
            });

            $('#submit_arrange').click(function () {
                var selection = []
                selection = $('#team_filter').val();

                var emp_id = selection;
                currRec.setValue({ fieldId: 'custpage_debt_inv_assign_emp_id', value: [emp_id] }); // Array of Id's for Employees
                var split_bool = false;
                currRec.setValue({ fieldId: 'custpage_debt_inv_assign_emp_split', value: split_bool });
                var count = selection.length;
                currRec.setValue({ fieldId: 'custpage_debt_inv_assign_count', value: count });

                $('#submitter').trigger('click');
            });
            /**
             *  Split
             */
            $('#submit_split').click(function () {
                var selection = []
                selection = $('#split_team_filter');
                var employee_id = $('#split_member_filter'); // Id of Employee's list that will be split

                var emp_id = employee_id;
                currRec.setValue({ fieldId: 'custpage_debt_inv_assign_emp_id', value: [emp_id] }); // Array of Id's for Employees
                var split_bool = true;
                currRec.setValue({ fieldId: 'custpage_debt_inv_assign_emp_split', value: split_bool });
                var count = selection.length;
                currRec.setValue({ fieldId: 'custpage_debt_inv_assign_count', value: count });
                var emp_split_id = selection_id;
                currRec.setValue({ fieldId: 'custpage_debt_inv_assign_emp_split_id', value: emp_split_id });

                $('#submitter').trigger('click');
            });
            $('#home_btn').click(function () {

            })
        }


        function saveRecord(context) {

            return true;
        }

        /**
             * Function to select Range Options
             */
        function selectMemberOptions() {
            // var rangeArray = rangeSelection();
            var range_filter = $('#split_member_filter option:selected').map(function () { return $(this).val() });
            range_filter = $.makeArray(range_filter);
            $('#split_member_filter').selectpicker('val', range_filter);
        }

        function selectTeamOptions() {
            var team_filter = $('#team_filter option:selected').map(function () { return $(this).val() });
            team_filter = $.makeArray(team_filter);
            $('#team_filter').selectpicker('val', team_filter);
        }


        function isNullorEmpty(strVal) {
            return (strVal == null || strVal == '' || strVal == 'null' || strVal == undefined || strVal == 'undefined' || strVal == '- None -');
        }

        return {
            pageInit: pageInit,
            saveRecord: saveRecord,

        };
    });