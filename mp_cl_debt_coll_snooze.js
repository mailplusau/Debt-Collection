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
function(error, runtime, search, url, record, format, email, currentRecord) {
    var baseURL = 'https://1048144.app.netsuite.com';
        if (runtime.EnvType == "SANDBOX") {
            baseURL = 'https://1048144-sb3.app.netsuite.com';
        }
        var role = runtime.getCurrentUser().role;
        var ctx = runtime.getCurrentScript();
        var currRec = currentRecord.get();

        /**
         * On page initialisation
         */
        function pageInit() {

            var invoice_id = currRec.getValue({
                fieldId: 'custpage_debt_coll_invoice_id'
            });
            var period = currRec.getValue({
                fieldId: 'custpage_debt_coll_period'
            });
            var date = currRec.getValue({
                fieldId: 'custpage_debt_coll_date'
            });
            var recordID = currRec.getValue({
                fieldId: 'custpage_debt_coll_record_id'
            });
            console.log('Invoice ID: ' + invoice_id)
            console.log('Period: ' + period);
            console.log('Date: ' + date);
            console.log('Record ID: ' + recordID);
            
            $('#close').click(function(){
                window.close();
            })
        }

        
        function saveRecord(context) {

            return true;
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

        function isNullorEmpty(strVal) {
            return (strVal == null || strVal == '' || strVal == 'null' || strVal == undefined || strVal == 'undefined' || strVal == '- None -');
        }

        return {
            pageInit: pageInit,
            saveRecord: saveRecord,
            
        };  
    }

    
);