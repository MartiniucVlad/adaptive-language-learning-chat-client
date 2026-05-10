// src/App.tsx
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom';
import RegisterForm from './components/RegisterForm.tsx';
import LoginForm from './components/LoginForm.tsx';
import ChatsPage from './components/chat';
import type {JSX} from "react";
import MainLayout from "./MainLayout.tsx";
import FriendsPage from "./components/FriendsPage.tsx";
import {WebSocketProvider} from "./services/WebSocketContext.tsx";
import {ColorModeProvider} from './ThemeContext';
import {SrsProvider} from "./components/a-srsNotes/SrsContext.tsx";

const ProtectedRoute = ({children}: { children: JSX.Element }) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        return <Navigate to="/login" replace/>;
    }
    return children;
};

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
                    {/* Keep SrsProvider wrapping everything so React Router
                        sees one single route tree and handles wildcards correctly */}
                    <SrsProvider>
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
                            </Route>

                            {/* --- DEFAULT REDIRECT --- */}
                            <Route path="*" element={<Navigate to="/register"/>}/>
                        </Routes>
                    </SrsProvider>
                </WebSocketProvider>
            </ColorModeProvider>
        </BrowserRouter>
    );
}

export default App;