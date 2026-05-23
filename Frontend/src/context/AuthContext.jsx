import { createContext, useContext, useState, useCallback } from "react";
import * as api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem("token");
    const name = localStorage.getItem("userName");
    return token ? { token, name } : null;
  });

  const loginFn = useCallback(async (email, password) => {
    const { data } = await api.login({ email, password });
    localStorage.setItem("token", data.token);
    // extract name from message like "John logged in"
    const name = data.message?.split(" logged in")[0] || email;
    localStorage.setItem("userName", name);
    setUser({ token: data.token, name });
    return data;
  }, []);

  const registerFn = useCallback(async (name, email, password) => {
    const { data } = await api.register({ name, email, password });
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login: loginFn, register: registerFn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
