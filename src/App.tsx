// src/App.tsx
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import RegisterForm from './components/RegisterForm.tsx';
import LoginForm from './components/LoginForm.tsx';
import ChatsPage from './components/chat';
import type {JSX} from "react";
import MainLayout from "./MainLayout.tsx";
import FriendsPage from "./components/FriendsPage.tsx";
import {AnkiProvider} from "./components/ankiNotes/AnkiContext.tsx";
import {WebSocketProvider} from "./services/WebSocketContext.tsx";
import { ColorModeProvider } from './ThemeContext';

const ProtectedRoute = ({children}: { children: JSX.Element }) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        return <Navigate to="/login" replace/>;
    }
    return children;
};

// If you ARE logged in, go to Chats (you don't need to login again)
const LoggedOutRoutes = ({children}: { children: JSX.Element }) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        return <Navigate to="/chats" replace/>;
    }
    return children;
};

function App() {
    const token = localStorage.getItem('access_token');
    return (
        <BrowserRouter>
            <ColorModeProvider>
                <WebSocketProvider token={token}>
                    <AnkiProvider>
                        <Routes>
                            {/* --- PUBLIC ROUTES (Only accessible if NOT logged in) --- */}
                            <Route
                                path="/register"
                                element={
                                    <LoggedOutRoutes>
                                        <RegisterForm/>
                                    </LoggedOutRoutes>
                                }
                            />

                            <Route
                                path="/login"
                                element={
                                    <LoggedOutRoutes>
                                        <LoginForm/>
                                    </LoggedOutRoutes>
                                }
                            />

                            {/* --- PROTECTED ROUTES (Only accessible if logged in) --- */}
                            <Route element={<ProtectedRoute><MainLayout/></ProtectedRoute>}>
                                <Route path="/chats" element={<ChatsPage/>}/>
                                <Route path="/friends" element={<FriendsPage/>}/>
                                {/* Add other protected routes like /profile here later */}
                            </Route>
                            {/* --- DEFAULT REDIRECT --- */}
                            {/* If the path is unknown, we send them to Register.
                However, since Register is now wrapped in LoggedOutRoutes,
                a logged-in user will be auto-bounced to /chats. Perfect! */}
                            <Route path="*" element={<Navigate to="/register"/>}/>
                        </Routes>
                    </AnkiProvider>
                </WebSocketProvider>
            </ColorModeProvider>
        </BrowserRouter>
    );
}

export default App;