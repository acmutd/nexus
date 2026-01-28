import React, {useState, useEffect, useMemo} from 'react';
import {useAuth} from '../context/authContext';
import {Navigate} from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';

const Icons = {
    Search: ({className = ''}) => (<svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${className} text-nexus-blue-500`}
    >
        <path d="M21 21l-4.34-4.34"/>
        <circle cx="11" cy="11" r="8"/>
    </svg>),

    Refresh: ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                    strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>
    </svg>), Link: ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                          strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/>
    </svg>), LinkOff: ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                             strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="m3 3 18 18"/>
    </svg>), Alert: ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                           strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
    </svg>), Calculator: ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25v-.008Zm2.25-4.5h.008v.008H10.5v-.008Zm0 2.25h.008v.008H10.5v-.008Zm0 2.25h.008v.008H10.5v-.008Zm2.25-4.5h.008v.008H12.75v-.008Zm0 2.25h.008v.008H12.75v-.008Zm0 2.25h.008v.008H12.75v-.008Z"/>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M6.75 3h10.5C18.49 3 19.5 4.01 19.5 5.25v13.5c0 1.24-1.01 2.25-2.25 2.25H6.75C5.51 21 4.5 19.99 4.5 18.75V5.25C4.5 4.01 5.51 3 6.75 3Z"/>
    </svg>), UserX: ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                           strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z"/>
    </svg>), Users: ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                           strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"/>
    </svg>), Academic: ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                              strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"/>
    </svg>), ShieldCheck: ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                                 strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"/>
    </svg>),
};

function StatCard({label, value, sub, icon: Icon}) {
    return (<div
        className="group relative rounded-2xl border border-nexus-blue-200/50 bg-white/90 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 px-5 py-5 overflow-hidden">
        <div
            className="absolute inset-0 bg-gradient-to-br from-nexus-blue-50/0 via-nexus-blue-50/0 to-nexus-blue-100/0 group-hover:from-nexus-blue-50/50 group-hover:to-nexus-blue-100/30 transition-all duration-500 rounded-2xl"/>
        <div className="relative flex items-start justify-between">
            <div className="flex-1">
                <div className="text-xs uppercase tracking-wider font-semibold text-nexus-blue-500">{label}</div>
                <div
                    className="mt-2 text-3xl font-bold text-nexus-blue-900 transition-all duration-300 group-hover:scale-105">{value}</div>
                {sub ? <div className="mt-1.5 text-xs text-gray-600 font-medium">{sub}</div> : null}
            </div>
            {Icon && (<div
                className="p-2.5 rounded-xl bg-nexus-blue-100/70 text-nexus-blue-600 group-hover:bg-nexus-blue-500 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Icon className="h-5 w-5"/>
            </div>)}
        </div>
    </div>);
}

function ActionButton({onClick, title, icon: Icon, hoverColor}) {
    const hoverClasses = {
        blue: 'hover:border-nexus-blue-200 hover:bg-nexus-blue-50 hover:text-nexus-blue-700 hover:shadow-nexus-blue-100',
        green: 'hover:border-green-300 hover:bg-green-50 hover:text-green-700 hover:shadow-green-100',
        orange: 'hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 hover:shadow-orange-100',
        yellow: 'hover:border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700 hover:shadow-yellow-100',
        red: 'hover:border-red-200 hover:bg-red-50 hover:text-red-700 hover:shadow-red-100',
    };

    return (<button
        onClick={onClick}
        title={title}
        className={`group/btn relative inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-gray-400 shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md ${hoverClasses[hoverColor]}`}
    >
        <Icon className="h-4 w-4 transition-transform duration-200 group-hover/btn:scale-110"/>
        <span
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-xs text-white opacity-0 pointer-events-none group-hover/btn:opacity-100 transition-opacity duration-200 shadow-lg z-50">
        {title}
        </span>
    </button>);
}

export default function AdminDashboard() {
    const {user, loading} = useAuth();

    const [users, setUsers] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState(null);
    const [expandedCourses, setExpandedCourses] = useState({});

    useEffect(() => {
        const checkAdminAndLoad = async () => {
            if (!user) {
                setIsAdmin(false);
                setIsCheckingAuth(false);
                return;
            }

            setIsLoadingData(true);
            setError(null);

            try {
                const token = await user.getIdToken();
                const res = await fetch('/api/admin/users', {
                    headers: {Authorization: `Bearer ${token}`},
                });

                if (res.ok) {
                    const data = await res.json();
                    setUsers(data.users || []);
                    console.log('Loaded users:', data.users.length, 'admins:', data.users.filter(u => u.isAdmin).length);
                    setIsAdmin(true);
                }
            } catch (e) {
                console.error('Admin check failed', e);
            } finally {
                setIsCheckingAuth(false);
                setIsLoadingData(false);
            }
        };

        if (!loading) {
            checkAdminAndLoad();
        }
    }, [user, loading]);

    const fetchUsers = async () => {
        try {
            setIsLoadingData(true);
            setError(null);
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/users', {
                headers: {Authorization: `Bearer ${token}`},
            });
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data.users || []);
        } catch (err) {
            setError(err?.message || 'Unknown error');
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleToggleAdmin = async (targetUid, currentStatus) => {
        const action = currentStatus ? 'REVOKE' : 'GRANT';
        if (!confirm(`${action} admin access for this user?`)) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/admin/users', {
                method: 'PUT', headers: {
                    'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
                }, body: JSON.stringify({targetUid, makeAdmin: !currentStatus}),
            });
            if (res.ok) {
                setUsers((prev) => prev.map((u) => u.uid === targetUid ? {...u, isAdmin: !currentStatus} : u));
                alert(`Admin access ${currentStatus ? 'revoked' : 'granted'}.`);
            } else {
                alert('Failed to update role.');
            }
        } catch (e) {
            console.error(e);
            alert('Network error updating role.');
        }
    };

    const handleUnlink = async (targetUid) => {
        if (!confirm('Unlink Discord? They will be kicked from channels.')) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/discord/unlink', {
                method: 'POST', headers: {
                    'Content-Type': 'application/json', Authorization: `Bearer ${token}`,
                }, body: JSON.stringify({uid: targetUid}),
            });
            if (res.ok) {
                setUsers((prev) => prev.map((u) => u.uid === targetUid ? {...u, discord: null} : u));
                alert('Discord unlinked.');
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (e) {
            console.error(e);
            alert('Network error unlinking Discord.');
        }
    };

    const handleDelete = async (targetUid, action) => {
        const prompt = action === 'grades' ? 'Wipe ALL grade calculator history?' : 'PERMANENTLY DELETE user data & grades?';
        if (!confirm(prompt)) return;
        try {
            const token = await user.getIdToken();
            const res = await fetch(`/api/admin/users?targetUid=${targetUid}&action=${action}`, {
                method: 'DELETE', headers: {Authorization: `Bearer ${token}`},
            });
            if (res.ok) {
                if (action === 'user') {
                    setUsers((prev) => prev.filter((u) => u.uid !== targetUid));
                } else {
                    alert('Grades wiped successfully.');
                }
            } else {
                alert('Failed to delete.');
            }
        } catch (e) {
            console.error(e);
            alert('Network error performing admin action.');
        }
    };

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter((u) => (u.netId?.toLowerCase() || '').includes(q) || (u.email?.toLowerCase() || '').includes(q) || (u.discord?.username?.toLowerCase() || '').includes(q));
    }, [users, search]);

    const stats = useMemo(() => {
        const total = users.length;
        const discordLinked = users.filter((u) => !!u.discord?.id).length;
        const withCourses = users.filter((u) => (u.courses?.length || 0) > 0).length;
        const avgCourses = total > 0 ? Math.round((users.reduce((acc, u) => acc + (u.courses?.length || 0), 0) / total) * 10) / 10 : 0;
        return {total, discordLinked, withCourses, avgCourses};
    }, [users]);

    if (loading || isCheckingAuth) return <LoadingScreen/>;
    if (!user || !isAdmin) return <Navigate to="/" replace/>;

    const toggleCourses = (uid) => {
        setExpandedCourses((prev) => ({
            ...prev, [uid]: !prev[uid],
        }));
    };


    return (<div
        className="min-h-screen pt-16 text-gray-900 relative overflow-x-hidden"
        style={{
            backgroundImage: "url('/assets/HomeBG.svg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
        }}
    >
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div
                className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-nexus-blue-300/40 blur-3xl animate-pulse"
                style={{animationDuration: '4s'}}
            />
            <div
                className="absolute top-1/3 -right-32 h-[500px] w-[500px] rounded-full bg-nexus-blue-200/50 blur-3xl animate-pulse"
                style={{animationDuration: '6s', animationDelay: '1s'}}
            />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-8">
            {/* header */}
            <div className="mb-6 flex flex-col gap-5">
                <div
                    className="rounded-3xl border border-white/40 bg-white/80 backdrop-blur-2xl shadow-2xl px-7 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-nexus-blue-900">
                                Nexus Control
                            </h1>
                            <p className="mt-2 text-sm font-medium text-nexus-blue-600 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span
                        className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                                {filteredUsers.length}/{users.length} users shown
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={fetchUsers}
                                disabled={isLoadingData}
                                className="group inline-flex items-center gap-2 rounded-xl border border-nexus-blue-200 bg-white/90 backdrop-blur px-4 py-2.5 text-sm font-semibold text-nexus-blue-700 shadow-md hover:shadow-lg hover:bg-nexus-blue-50 disabled:opacity-60"
                            >
                                <Icons.Refresh
                                    className={`h-4 w-4 transition-transform ${isLoadingData ? 'animate-spin' : 'group-hover:rotate-180 duration-500'}`}
                                />
                                Refresh
                            </button>

                            <div className="relative">
                                {/* Icon */}
                                <div
                                    className="pointer-events-none absolute inset-y-0 left-3 flex items-center z-10">
                                    <Icons.Search className="h-4 w-4 text-nexus-blue-500"/>
                                </div>

                                {/* Input */}
                                <input
                                    type="text"
                                    value={search}
                                    placeholder="Search NetID, email, Discord…"
                                    className="h-11 w-[340px] rounded-xl border border-nexus-blue-200 bg-white/90 backdrop-blur px-4 pl-9 text-sm font-medium outline-none shadow-md focus:ring-2 focus:ring-nexus-blue-400"
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard label="Total users" value={stats.total} icon={Icons.Users}/>
                    <StatCard
                        label="Discord linked"
                        value={stats.discordLinked}
                        sub={stats.total ? `${Math.round((stats.discordLinked / stats.total) * 100)}% linked` : '—'}
                        icon={Icons.Link}
                    />
                    <StatCard
                        label="With courses"
                        value={stats.withCourses}
                        icon={Icons.Academic}
                    />
                    <StatCard
                        label="Avg courses"
                        value={stats.avgCourses}
                        sub="Per user"
                        icon={Icons.Calculator}
                    />
                </div>
            </div>

            {error && (<div
                className="mb-6 rounded-2xl border border-red-300 bg-red-50/90 backdrop-blur px-5 py-4 text-red-700 flex items-center gap-3">
                <Icons.Alert className="h-5 w-5"/>
                <div className="text-sm font-medium">{error}</div>
            </div>)}

            <div
                className="rounded-3xl border border-white/50 bg-white/90 backdrop-blur-2xl shadow-2xl overflow-hidden">
                <div className="max-h-[calc(100vh-475px)] overflow-auto">
                    <table className="w-full text-sm text-left">
                        <thead
                            className="sticky top-0 z-10 bg-gradient-to-r from-nexus-blue-50 to-nexus-blue-100/80 backdrop-blur-xl border-b-2 border-nexus-blue-200/50">
                        <tr className="text-xs uppercase tracking-wider font-bold text-nexus-blue-800">
                            <th className="px-6 py-5">User</th>
                            <th className="px-6 py-5">Discord</th>
                            <th className="px-6 py-5">Courses</th>
                            <th className="px-6 py-5 text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                        {isLoadingData && users.length === 0 ? (<tr>
                            <td colSpan="4" className="p-12 text-center text-gray-500">
                                Loading users...
                            </td>
                        </tr>) : filteredUsers.length === 0 ? (<tr>
                            <td colSpan="4" className="p-12 text-center text-gray-500">
                                No matching users.
                            </td>
                        </tr>) : (filteredUsers.map((u) => (<tr
                            key={u.uid}
                            className="group hover:bg-gradient-to-r hover:from-nexus-blue-50/60 hover:to-transparent transition-all duration-200"
                        >
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                    {u.discord?.avatarUrl ? (<img
                                        src={u.discord.avatarUrl}
                                        alt="avatar"
                                        className="h-11 w-11 rounded-full border-2 border-white shadow-md"
                                    />) : (<div
                                        className="h-11 w-11 rounded-full bg-gradient-to-br from-nexus-blue-100 to-nexus-blue-200 text-nexus-blue-700 flex items-center justify-center font-bold text-sm border-2 border-white shadow-md">
                                        {u.netId?.[0] || '?'}
                                    </div>)}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-gray-900 font-mono text-base">
                                                {u.netId || '—'}
                                            </div>
                                            {u.isAdmin && (<span
                                                className="inline-flex items-center rounded-full border border-nexus-blue-200 bg-gradient-to-r from-nexus-blue-50 to-nexus-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-nexus-blue-800">ADMIN</span>)}
                                            {u.uid === user.uid && (<span
                                                className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">YOU</span>)}
                                        </div>
                                        <div
                                            className="text-xs text-gray-500 truncate max-w-[320px] font-medium">
                                            {u.email}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            <td className="px-6 py-5">
                                {u.discord?.id ? (<span
                                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#5865F2]/20 bg-[#5865F2]/10 px-3 py-1.5 text-xs font-bold text-[#5865F2]">
                            <Icons.Link className="h-3.5 w-3.5"/>
                            @{u.discord.username}
                          </span>) : (<span
                                    className="inline-flex items-center gap-1.5 rounded-full border-2 border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-500">
                            <Icons.LinkOff className="h-3.5 w-3.5"/>
                            Not linked
                          </span>)}
                            </td>

                            <td className="px-6 py-5 align-top w-64">
                                <div className="max-w-[240px]">
                                    <div
                                        className={"flex flex-wrap items-center gap-1.5 " + (expandedCourses[u.uid] ? "" : "overflow-hidden")}
                                    >
                                        {(() => {
                                            const all = u.courses || [];
                                            const isExpanded = expandedCourses[u.uid];
                                            const visible = isExpanded ? all : all.slice(0, 1);

                                            if (all.length === 0) {
                                                return (<span
                                                    className="text-xs italic text-gray-400 font-medium">No courses</span>);
                                            }

                                            return (<>
                                                {visible.map((c, i) => (<span
                                                    key={i}
                                                    title={c.name}
                                                    className="cursor-help rounded-full border-2 border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800"
                                                >{c.code}</span>))}

                                                {all.length > visible.length && !isExpanded && (<button
                                                    type="button"
                                                    onClick={() => toggleCourses(u.uid)}
                                                    className="text-xs font-semibold text-nexus-blue-700 underline decoration-dotted underline-offset-2 ml-1 whitespace-nowrap"
                                                >
                                                    +{all.length - visible.length} more
                                                </button>)}

                                                {all.length > 2 && isExpanded && (<button
                                                    type="button"
                                                    onClick={() => toggleCourses(u.uid)}
                                                    className="text-xs font-semibold text-gray-500 underline decoration-dotted underline-offset-2 ml-1 whitespace-nowrap"
                                                >
                                                    show less
                                                </button>)}
                                            </>);
                                        })()}
                                    </div>
                                </div>
                            </td>

                            <td className="px-6 py-5 text-right">
                                <div className="relative z-20">
                                    <div
                                        className="flex justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                                        <ActionButton
                                            onClick={() => handleToggleAdmin(u.uid, u.isAdmin)}
                                            title={u.isAdmin ? 'Revoke admin' : 'Make admin'}
                                            icon={Icons.ShieldCheck}
                                            hoverColor={u.isAdmin ? 'red' : 'green'}
                                        />
                                        <ActionButton
                                            onClick={() => handleDelete(u.uid, 'grades')}
                                            title="Wipe grades"
                                            icon={Icons.Calculator}
                                            hoverColor="orange"
                                        />
                                        {u.discord?.id && (<ActionButton
                                            onClick={() => handleUnlink(u.uid)}
                                            title="Unlink Discord"
                                            icon={Icons.LinkOff}
                                            hoverColor="yellow"
                                        />)}
                                        <ActionButton
                                            onClick={() => handleDelete(u.uid, 'user')}
                                            title="Delete user"
                                            icon={Icons.UserX}
                                            hoverColor="red"
                                        />
                                    </div>
                                </div>
                            </td>
                        </tr>)))}
                        </tbody>
                    </table>
                </div>

                <div
                    className="flex items-center justify-between gap-3 border-t-2 border-nexus-blue-100 bg-gradient-to-r from-nexus-blue-50 to-white/80 px-6 py-4 text-xs font-semibold text-nexus-blue-700">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-400"/>
                        {isLoadingData ? 'Refreshing…' : 'Ready'}
                    </div>
                    <div
                        className="font-mono text-nexus-blue-600 bg-nexus-blue-50 px-3 py-1 rounded-full border border-nexus-blue-200">
                        /admin
                    </div>
                </div>
            </div>
        </div>
    </div>);
}
