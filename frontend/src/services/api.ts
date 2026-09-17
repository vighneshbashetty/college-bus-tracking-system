// With Vite's proxy configured in vite.config.ts, all /api requests are routed locally automatically
const BASE_URL = import.meta.env.VITE_API_URL || "";

export interface ApiUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface ApiDriver {
  id: number;
  user_id: number;
  name: string;
  bus_id: string | null;
  email: string;
}

export interface ApiLocation {
  id?: number;
  bus_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  timestamp: string;
}

class ApiService {
  private token: string | null = typeof localStorage !== "undefined" ? localStorage.getItem("ct_token") : null;
  private role: string | null = typeof localStorage !== "undefined" ? localStorage.getItem("ct_role") : null;
  private email: string | null = typeof localStorage !== "undefined" ? localStorage.getItem("ct_email") : null;
  private name: string | null = typeof localStorage !== "undefined" ? localStorage.getItem("ct_name") : null;
  private isConnectedMode: boolean = typeof localStorage !== "undefined" ? localStorage.getItem("ct_connected") === "true" : false;

  get tokenValue() {
    return this.token;
  }
  
  get roleValue() {
    return this.role;
  }
  
  get emailValue() {
    return this.email;
  }
  
  get nameValue() {
    return this.name;
  }
  
  isConnected() {
    return this.isConnectedMode;
  }

  setConnected(connected: boolean) {
    this.isConnectedMode = connected;
    localStorage.setItem("ct_connected", connected ? "true" : "false");
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 204) {
      return null;
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Request failed");
    }
    return data;
  }

  async login(email: string, password: string): Promise<any> {
    const data = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    this.token = data.access_token;
    this.role = data.role;
    this.name = data.name;
    this.email = data.email;

    localStorage.setItem("ct_token", data.access_token);
    localStorage.setItem("ct_role", data.role);
    localStorage.setItem("ct_name", data.name);
    localStorage.setItem("ct_email", data.email);

    return data;
  }

  async register(email: string, password: string, name: string, role: string): Promise<any> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name, role }),
    });
  }

  logout() {
    this.token = null;
    this.role = null;
    this.name = null;
    this.email = null;

    localStorage.removeItem("ct_token");
    localStorage.removeItem("ct_role");
    localStorage.removeItem("ct_name");
    localStorage.removeItem("ct_email");
  }

  async getBuses(): Promise<any[]> {
    return this.request("/api/buses");
  }

  async createBus(bus: any): Promise<any> {
    return this.request("/api/buses", {
      method: "POST",
      body: JSON.stringify(bus),
    });
  }

  async updateBus(id: string, patch: any): Promise<any> {
    return this.request(`/api/buses/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  }

  async deleteBus(id: string): Promise<void> {
    return this.request(`/api/buses/${id}`, {
      method: "DELETE",
    });
  }

  async getDrivers(): Promise<ApiDriver[]> {
    return this.request("/api/drivers");
  }

  async createDriver(driver: any): Promise<ApiDriver> {
    return this.request("/api/drivers", {
      method: "POST",
      body: JSON.stringify(driver),
    });
  }

  async updateDriver(id: number, patch: any): Promise<ApiDriver> {
    return this.request(`/api/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  }

  async deleteDriver(id: number): Promise<void> {
    return this.request(`/api/drivers/${id}`, {
      method: "DELETE",
    });
  }

  async sendLocation(
    busId: string,
    latitude: number,
    longitude: number,
    speed?: number | null,
    timestamp?: string
  ): Promise<any> {
    return this.request("/api/locations", {
      method: "POST",
      body: JSON.stringify({
        bus_id: busId,
        latitude,
        longitude,
        speed: speed ?? null,
        timestamp: timestamp || new Date().toISOString(),
      }),
    });
  }

  async getLatestLocation(busId: string): Promise<ApiLocation | null> {
    try {
      return await this.request(`/api/locations/${busId}/latest`);
    } catch {
      return null;
    }
  }

  async getLocations(busId: string): Promise<ApiLocation[]> {
    return this.request(`/api/locations/${busId}`);
  }

  async sendChatMessage(message: string, history: any[] = []): Promise<string> {
    const res = await this.request("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, history }),
    });
    return res.reply;
  }

  async getMyPass(): Promise<any> {
    return this.request("/api/pass/my-pass");
  }

  async verifyPass(passCode: string, busId: string): Promise<any> {
    return this.request("/api/pass/verify", {
      method: "POST",
      body: JSON.stringify({ pass_code: passCode, bus_id: busId }),
    });
  }

  async predictETA(params: {
    busId: string;
    stopId: string;
    weather?: string;
    trafficLevel?: string;
  }): Promise<any> {
    return this.request("/api/ai/predict-eta", {
      method: "POST",
      body: JSON.stringify({
        bus_id: params.busId,
        stop_id: params.stopId,
        weather: params.weather || "clear",
        traffic_level: params.trafficLevel || null,
      }),
    });
  }

  async getModelInfo(): Promise<any> {
    return this.request("/api/ai/model-info");
  }
}

export const api = new ApiService();
