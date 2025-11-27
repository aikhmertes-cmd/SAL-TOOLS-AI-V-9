// --- HWID ---
function get_hwid(): string {
    let hwid = localStorage.getItem('keyauth_hwid');
    if (!hwid) {
        hwid = crypto.randomUUID();
        localStorage.setItem('keyauth_hwid', hwid);
    }
    return hwid;
}

const VALID_USERNAME = "Admin Sal";
const VALID_PASSWORD = "studentai2026";


// --- API ---
export class KeyAuthAPI {
    // KeyAuth application details from user specification
    private readonly name: string = "Tools-AI";
    private readonly ownerid: string = "YaGaAZPieQ";
    private readonly version: string = "1.0";

    private sessionid: string | null = null;
    private initialized: boolean = false;

    private _simulateNetwork<T>(data: T, delay: number = 800): Promise<T> {
        return new Promise(resolve => setTimeout(() => resolve(data), delay));
    }

    async init(): Promise<{ success: boolean; message: string; sessionid?: string }> {
        if (this.initialized) {
            return this._simulateNetwork({ success: true, message: "Session already initialized." });
        }
        
        this.sessionid = crypto.randomUUID();
        this.initialized = true;
        
        return this._simulateNetwork({
            success: true,
            message: "Session has been initialized.",
            sessionid: this.sessionid
        });
    }

    async login(username: string, key: string): Promise<{ success: boolean; message: string; info?: object }> {
        if (!this.initialized) {
            return this._simulateNetwork({ success: false, message: "Not initialized. Please wait or refresh." });
        }

        const trimmedUser = username.trim();
        const trimmedKey = key.trim();

        if (trimmedUser.length === 0) {
            return this._simulateNetwork({ success: false, message: "Username cannot be empty." });
        }
        if (trimmedKey.length === 0) {
            return this._simulateNetwork({ success: false, message: "Password cannot be empty." });
        }
        
        if (trimmedUser.toLowerCase() !== VALID_USERNAME.toLowerCase()) {
            return this._simulateNetwork({ success: false, message: "Invalid username provided. Please try again." });
        }

        if (trimmedKey === VALID_PASSWORD) {
            const today = new Date();
            const expiryDate = new Date();
            expiryDate.setFullYear(today.getFullYear() + 2);
            
            const expiryString = expiryDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
            const timeDiff = expiryDate.getTime() - today.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

            return this._simulateNetwork({
                success: true,
                message: "Logged in!",
                info: {
                    username: trimmedUser,
                    subscriptions: [{ 
                        subscription: "default", 
                        expiry: expiryString,
                        daysLeft: daysLeft
                    }],
                    ip: "127.0.0.1",
                    hwid: get_hwid(),
                    createdate: "1679310000",
                    lastlogin: Date.now().toString().substring(0, 10),
                }
            });
        }
        
        return this._simulateNetwork({ success: false, message: "Invalid password provided. Please try again." });
    }

    async register(username: string, key: string): Promise<{ success: boolean; message: string }> {
        if (!this.initialized) {
            return this._simulateNetwork({ success: false, message: "Not initialized. Please wait or refresh." });
        }
        
        const trimmedUser = username.trim();
        const trimmedKey = key.trim();

        if (trimmedUser.length === 0) {
            return this._simulateNetwork({ success: false, message: "Username cannot be empty." });
        }
        if (trimmedKey.length === 0) {
            return this._simulateNetwork({ success: false, message: "Password cannot be empty." });
        }

        if (trimmedUser.toLowerCase() === VALID_USERNAME.toLowerCase() && trimmedKey === VALID_PASSWORD) {
            return this._simulateNetwork({
                success: true,
                message: "Successfully registered account!"
            });
        }
        
        return this._simulateNetwork({ success: false, message: "Invalid credentials provided. Please try again." });
    }
    
    getHwid(): string {
        return get_hwid();
    }
}