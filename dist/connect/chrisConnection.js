"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chrisConnection = exports.ChRISConnection = exports.Client = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const chrisapi_1 = __importDefault(require("@fnndsc/chrisapi"));
exports.Client = chrisapi_1.default;
const fs_2 = require("fs");
const path_2 = require("path");
// Read package.json
const packageJson = JSON.parse((0, fs_2.readFileSync)((0, path_2.join)(__dirname, "../..", "package.json"), "utf-8"));
const name = packageJson.name;
class ChRISConnection {
    constructor() {
        this.authToken = null;
        this.user = null;
        this.chrisURL = null;
        this.client = null;
        this.instanceDataSet = false;
        const configBase = process.env.XDG_CONFIG_HOME || path_1.default.join(os_1.default.homedir(), ".config");
        this.configDir = path_1.default.join(configBase, name);
        this.ensureDirExists(this.configDir);
        this.userFile = path_1.default.join(this.configDir, "lastUser.txt");
        this.instanceDir = "";
        this.loadUser();
        this.tokenFile = name.replace("/", "_") + "_token.txt";
        this.chrisURLfile = "chrisurl.txt";
        this.chrisURL = "";
        if (this.user) {
            this.instanceData_set(this.user);
            this.instanceDataSet = true;
        }
        this.client = null;
    }
    ensureDirExists(dir) {
        if (!fs_1.default.existsSync(dir)) {
            try {
                fs_1.default.mkdirSync(dir, { recursive: true, mode: 0o700 });
            }
            catch (error) {
                console.error("Error creating directory:", error);
            }
        }
    }
    instanceData_set(user) {
        this.instanceDir = path_1.default.join(this.configDir, user);
        this.ensureDirExists(this.instanceDir);
        this.tokenFile = path_1.default.join(this.instanceDir, this.tokenFile);
        this.chrisURLfile = path_1.default.join(this.instanceDir, this.chrisURLfile);
    }
    userConfigSet(user, url) {
        this.user = user;
        this.saveToFile(this.userFile, user);
        if (!this.instanceDataSet) {
            this.instanceData_set(user);
        }
    }
    async connect(options) {
        const { user, password, debug, url } = options;
        const authUrl = url + "auth-token/";
        this.chrisURL = url;
        console.log(`Connecting to ${url} with user ${user}`);
        this.userConfigSet(user, url);
        try {
            this.authToken = await chrisapi_1.default.getAuthToken(authUrl, user, password);
            if (this.authToken) {
                console.log("Auth token: " + this.authToken);
                this.saveToFile(this.tokenFile, this.authToken);
                this.saveToFile(this.chrisURLfile, url);
                console.log("Auth token saved successfully");
                console.log("ChRIS URL  saved successfully");
                return this.authToken;
            }
            else {
                console.log("Failed to receive auth token");
                return null;
            }
        }
        catch (error) {
            console.error("\nSome error seems to have been thrown while attempting to log in.");
            console.error("If the ChRIS CUBE is reachable, then it's quite possible this means");
            console.error("an incorrect login. Please check your login credentials carefully.");
            console.error("Also, if your password has 'special' character, make sure how you");
            console.error("are specifying it is compatible with your shell!");
            console.error("\nExiting to system with code 1...");
            if (debug) {
                throw error;
            }
            process.exit(1);
        }
    }
    getAuthToken() {
        if (!this.authToken) {
            this.loadToken();
        }
        return this.authToken;
    }
    getChRISurl() {
        if (!this.chrisURL) {
            this.loadChRISurl();
        }
        return this.chrisURL;
    }
    getClient() {
        if (this.getAuthToken() &&
            this.getChRISurl() &&
            this.chrisURL &&
            this.authToken) {
            if (!this.client) {
                this.client = new chrisapi_1.default(this.chrisURL, { token: this.authToken });
            }
        }
        return this.client;
    }
    isConnected() {
        return this.getAuthToken() !== null;
    }
    loggedIn_check() {
        let loggedIn = true;
        if (!this.client) {
            console.log("(connect) Not connected to ChRIS. Please connect first using the connect command.");
            loggedIn = false;
        }
        return loggedIn;
    }
    logout() {
        this.authToken = null;
        try {
            fs_1.default.unlinkSync(this.tokenFile);
            console.log("Logged out successfully");
        }
        catch (error) {
            console.error("Error during logout:", error);
        }
    }
    saveToFile(file, info) {
        try {
            fs_1.default.writeFileSync(file, info || "", { mode: 0o600 });
        }
        catch (error) {
            console.error("For info: ", info);
            console.error("Error saving to file ", file, ": ", error);
        }
    }
    saveToken() {
        try {
            fs_1.default.writeFileSync(this.tokenFile, this.authToken || "", { mode: 0o600 });
        }
        catch (error) {
            console.error("Error saving token:", error);
        }
    }
    loadUser() {
        try {
            this.user = fs_1.default.readFileSync(this.userFile, "utf-8");
        }
        catch (error) {
            this.user = null;
        }
    }
    loadToken() {
        try {
            this.authToken = fs_1.default.readFileSync(this.tokenFile, "utf-8");
        }
        catch (error) {
            this.authToken = null;
        }
    }
    loadChRISurl() {
        try {
            this.chrisURL = fs_1.default.readFileSync(this.chrisURLfile, "utf-8");
        }
        catch (error) {
            this.chrisURL = null;
        }
    }
}
exports.ChRISConnection = ChRISConnection;
exports.chrisConnection = new ChRISConnection();
//# sourceMappingURL=chrisConnection.js.map