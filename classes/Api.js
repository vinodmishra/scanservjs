var dateFormat = require('dateformat');
var fs = require('fs');
var Q = require('kew');

var Config = require('./Config');
var Device = require('./Device');
var System = require('./System');
var FileInfo = require('./FileInfo');
var ScanRequest = require('./ScanRequest');
var Scanimage = require('./Scanimage');
var Convert = require('./Convert');

module.exports = function () {
    var _this = this;

    _this.fileList = function () {
        var deferred = Q.defer();
        var outdir = Config.OutputDirectory;

        fs.readdir(outdir, function (err, list) {
            if (err) {
                deferred.reject(err);
            }

            var files = list.map(function (f) {
                return new FileInfo(outdir + f);
            }).filter(function (f) {
                return f.extension === '.tif' || f.extension === '.jpg' || f.extension == '.pdf';
            });

            deferred.resolve(files);
        });

        return deferred.promise;
    };

    _this.fileDelete = function (req) {
        var f = new FileInfo(req.data);
        return Q.resolve(f.delete());
    };

    _this.scan = function (req) {
        var dateString = dateFormat(new Date(), 'yyyy-mm-dd-HH-MM-ss');
        System.extend(req, {
            outputFilepath: Config.OutputDirectory + 'Scan_' + dateString + '.tif'
        });

        var scanRequest = new ScanRequest(req);
        var scanner = new Scanimage();
        var options = {
            source: Config.OutputDirectory + 'Scan_' + dateString + '.tif',
            target: Config.OutputDirectory + 'Scan_' + dateString + '.pdf',
            trim: false
        };
        var convert = new Convert(options);

        return scanner.execute(scanRequest)
            .then(function (response) {
                if (response.type == 'pdf') {
                    convert.execute();
                }
                return response;
            });
    };

    _this.preview = function (req) {
        var scanRequest = new ScanRequest({
            mode: req.mode,
            brightness: req.brightness,
            contrast: req.contrast,
            format: 'jpg',
            outputFilepath: Config.PreviewDirectory + 'preview.jpg',
            resolution: Config.PreviewResolution
        });

        var scanner = new Scanimage();
        return scanner.execute(scanRequest);
    };

    var testFileExists = function (path) {
        var file = new FileInfo(path);
        if (file.exists()) {
            return {
                success: true,
                message: 'Found ' + file.name + ' at "' + path + '"'
            };
        }

        return {
            success: false,
            message: 'Unable to find ' + file.name + ' at "' + path + '"'
        };
    };

    _this.diagnostics = function () {
        var tests = [];

        tests.push(testFileExists(Config.Scanimage));
        tests.push(testFileExists(Config.Convert));

        return Q.resolve(tests);
    };

    _this.device = function () {
        return new Device().get();
    };
};