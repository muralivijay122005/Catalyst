// src/Components/Inbox.jsx
import React, { useState, useEffect, useRef } from "react";
import { HiHashtag, HiPlus, HiCheck, HiXMark } from "react-icons/hi2";
import { IoArrowForward } from "react-icons/io5";
import { IoSearchOutline } from "react-icons/io5";
import { LuAtSign } from "react-icons/lu";
import { useAuth } from "../context/AuthContext";

const API_BASE = "http://localhost:5000/api";

// Helper for Initials Avatar
const InitialAvatar = ({ name, size = "32" }) => {
    const initial = name?.charAt(0)?.toUpperCase() || "?";
    return (
        <div 
            className={`w-${size} h-${size} bg-neutral-300 text-neutral-700 rounded-full flex items-center justify-center text-sm flex-shrink-0`}
            style={{ width: `${size}px`, height: `${size}px` }}
        >
            {initial}
        </div>
    );
};

// Helper to format date for chat separators
const formatMessageDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    
    return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

const Inbox = () => {
    const { currentUser } = useAuth();
    
    const [channels, setChannels] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [creatingChannel, setCreatingChannel] = useState(false);
    const [tempChannelName, setTempChannelName] = useState("");

    const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
    const [mentionQuery, setMentionQuery] = useState("");
    const [showMentions, setShowMentions] = useState(false);
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

    const inputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const currentUserId = currentUser?._id?.toString() || currentUser?.id?.toString();

    // Mention system helper functions
    const getMentionRegex = () => {
        const names = [
            ...(currentUser ? [[currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ")] : []),
            ...allUsers.map(u => [u.firstName, u.lastName].filter(Boolean).join(" "))
        ].filter(Boolean);
        
        if (names.length === 0) return null;
        
        const uniqueNames = Array.from(new Set(names));
        const escapedNames = uniqueNames.map(name => name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
        return new RegExp(`@(${escapedNames.join('|')})\\b`, 'g');
    };

    const renderMessageText = (text) => {
        if (!text) return "";
        
        const regex = getMentionRegex();
        if (!regex) return text;
        
        const parts = [];
        let lastIndex = 0;
        let match;
        
        regex.lastIndex = 0;
        
        while ((match = regex.exec(text)) !== null) {
            const matchIndex = match.index;
            const matchText = match[0];
            
            if (matchIndex > lastIndex) {
                parts.push(text.substring(lastIndex, matchIndex));
            }
            
            parts.push(
                <span key={matchIndex} className="text-indigo-700 p-1 py-0.5 rounded">
                    {matchText}
                </span>
            );
            
            lastIndex = regex.lastIndex;
        }
        
        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }
        
        return parts.length > 0 ? parts : text;
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setNewMessage(value);
        
        const cursor = e.target.selectionStart;
        const lastAtIndex = value.lastIndexOf("@", cursor - 1);
        
        if (lastAtIndex !== -1) {
            const isStartOrAfterSpace = lastAtIndex === 0 || /\s/.test(value[lastAtIndex - 1]);
            const textAfterAt = value.substring(lastAtIndex + 1, cursor);
            const isValidQuery = !textAfterAt.startsWith(" ") && !/\n/.test(textAfterAt) && textAfterAt.length < 30;
            
            if (isStartOrAfterSpace && isValidQuery) {
                setMentionTriggerIndex(lastAtIndex);
                setMentionQuery(textAfterAt);
                setShowMentions(true);
                setSelectedMentionIndex(0);
                return;
            }
        }
        
        setShowMentions(false);
        setMentionTriggerIndex(-1);
        setMentionQuery("");
    };

    const selectMember = (member) => {
        if (mentionTriggerIndex === -1) return;
        
        const beforeMention = newMessage.substring(0, mentionTriggerIndex);
        const afterMention = newMessage.substring(inputRef.current?.selectionStart || newMessage.length);
        const mentionText = `@${member.firstName} ${member.lastName} `;
        
        const updatedMessage = beforeMention + mentionText + afterMention;
        setNewMessage(updatedMessage);
        setShowMentions(false);
        setMentionTriggerIndex(-1);
        setMentionQuery("");
        
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newCursorPos = beforeMention.length + mentionText.length;
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const handleInputKeyDown = (e) => {
        if (showMentions && mentionMembers.length > 0) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedMentionIndex(prev => (prev + 1) % mentionMembers.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedMentionIndex(prev => (prev - 1 + mentionMembers.length) % mentionMembers.length);
            } else if (e.key === "Enter") {
                e.preventDefault();
                selectMember(mentionMembers[selectedMentionIndex]);
            } else if (e.key === "Escape") {
                e.preventDefault();
                setShowMentions(false);
            }
        }
    };

    const mentionMembers = [
        ...(currentUser ? [currentUser] : []),
        ...allUsers
    ].filter(user => {
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
        const username = (user.username || "").toLowerCase();
        const query = mentionQuery.toLowerCase();
        return fullName.includes(query) || username.includes(query);
    });

    // Fetch Channels & DMs
    const fetchChannels = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/channels`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setChannels(data);
            }
        } catch (err) {
            console.error("Failed to fetch channels", err);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setAllUsers(data.filter(u => (u._id?.toString() || u.id?.toString()) !== currentUserId));
            }
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const fetchMessages = async (channelId) => {
        if (!channelId) return;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/messages/${channelId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (err) {
            console.error("Failed to fetch messages", err);
        } finally {
            setLoading(false);
        }
    };

    const getDMReceiver = (channel) => {
        if (!channel?.isDM || !Array.isArray(channel.participants)) return null;

        const other = channel.participants.find(p => {
            const id = p?._id || p;
            return id && id.toString() !== currentUserId;
        });

        if (!other) return null;
        if (typeof other === 'object' && other.firstName) return other;
        return allUsers.find(u => (u._id?.toString() || u.id?.toString()) === (other._id || other).toString());
    };

    const startDM = async (user) => {
        const token = localStorage.getItem("token");
        const targetId = user._id?.toString() || user.id?.toString();

        const existingDM = channels.find(ch =>
            ch.isDM && ch.participants?.some(p => (p._id || p).toString() === targetId)
        );

        if (existingDM) {
            setSelectedChannel(existingDM);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/channels`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: `${user.firstName} ${user.lastName}`,
                    isDM: true,
                    participants: [currentUserId, targetId]
                }),
            });

            if (res.ok) {
                const newDM = await res.json();
                setChannels(prev => [...prev, newDM]);
                setSelectedChannel(newDM);
            }
        } catch (err) {
            console.error("Failed to create DM", err);
        }
    };

    const handleCreateChannel = async () => {
        if (!tempChannelName.trim()) return;
        
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/channels`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: tempChannelName.trim(),
                    isDM: false
                }),
            });

            if (res.ok) {
                const newChannel = await res.json();
                setChannels(prev => [...prev, newChannel]);
                setSelectedChannel(newChannel);
                setCreatingChannel(false);
                setTempChannelName("");
            }
        } catch (err) {
            console.error("Failed to create channel", err);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChannel || sending) return;

        setSending(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    channelId: selectedChannel._id,
                    text: newMessage.trim(),
                }),
            });

            if (res.ok) {
                const savedMsg = await res.json();
                const msgWithSender = {
                    ...savedMsg,
                    sender: {
                        _id: currentUserId,
                        firstName: currentUser.firstName,
                        lastName: currentUser.lastName,
                    }
                };
                setMessages(prev => [...prev, msgWithSender]);
                setNewMessage("");
            }
        } catch (err) {
            console.error("Failed to send message", err);
        } finally {
            setSending(false);
        }
    };

    // Effects
    useEffect(() => {
        if (currentUser && currentUserId) {
            fetchChannels();
            fetchAllUsers();
        }
    }, [currentUser, currentUserId]);

    // Select the topmost channel as default when channels are loaded
    useEffect(() => {
        if (channels.length > 0 && !selectedChannel) {
            const pubChannels = channels.filter(ch => !ch.isDM);
            if (pubChannels.length > 0) {
                setSelectedChannel(pubChannels[0]);
            } else {
                setSelectedChannel(channels[0]);
            }
        }
    }, [channels, selectedChannel]);

    useEffect(() => {
        if (selectedChannel) fetchMessages(selectedChannel._id);
    }, [selectedChannel]);

    useEffect(() => {
        let interval;
        if (selectedChannel) {
            interval = setInterval(() => fetchMessages(selectedChannel._id), 1500);
        }
        return () => clearInterval(interval);
    }, [selectedChannel]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (inputRef.current && !inputRef.current.contains(e.target)) {
                setShowMentions(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    const filteredChannels = channels.filter(ch => !ch.isDM);
    const activeDMs = channels.filter(ch => ch.isDM);

    const filteredUsers = allUsers.filter(user => {
        const nameMatch = `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username?.toLowerCase().includes(searchTerm.toLowerCase());
        const isNotActiveDM = !activeDMs.some(dm => 
            dm.participants.some(p => (p._id || p).toString() === (user._id || user.id).toString())
        );
        return nameMatch && isNotActiveDM;
    });

    return (
        <div className="flex h-full bg-white rounded-xl overflow-hidden">
            {/* Sidebar */}
            <div className="w-1/5 bg-white border-r border-neutral-200 flex flex-col">
                <div className="p-4">
                    <div className="relative">
                        <IoSearchOutline size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-1.5 bg-neutral-200/60 rounded-lg text-sm focus:outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-y-auto px-4 space-y-6 custom-scroll-hidden">
                    {/* Public Channels */}
<div>
    <div className="flex items-center justify-between mb-3 ps-2">
        <div className="text-xs text-black/60">Channels</div>
        {currentUser?.role === 'admin' && (
            <button 
                onClick={() => {
                    setCreatingChannel(true);
                    setTempChannelName("New Channel");
                }}
                className="p-1 hover:bg-neutral-200 rounded-md transition-colors"
                title="Create Channel"
            >
                <HiPlus size={12} className="text-black/60" />
            </button>
        )}
    </div>
    
    {/* Create Channel Input Row */}
{creatingChannel && currentUser?.role === 'admin' && (
    <div className="px-1 mb-0.5">
        <div className="flex items-center px-2 py-1 rounded-md">
            
            <span className="text-[14px] mr-2">#</span>

            {/* Input */}
            <input
                autoFocus
                value={tempChannelName}
                onChange={(e) => setTempChannelName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateChannel();

                    if (e.key === "Escape") {
                        setCreatingChannel(false);
                        setTempChannelName("");
                    }
                }}
                onFocus={(e) => e.target.select()}
                placeholder="Channel name"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-400 min-w-0"
            />

            {/* Actions Inside Box */}
            <div className="flex items-center gap-1 ml-2">
                <button
                    onClick={handleCreateChannel}
                    className="w-5 h-5 flex items-center justify-center border border-neutral-300 rounded hover:bg-neutral-200 transition-colors"
                >
                    <HiCheck
                        size={12}
                        
                    />
                </button>

                <button
                    onClick={() => {
                        setCreatingChannel(false);
                        setTempChannelName("");
                    }}
                    className="w-5 h-5 flex items-center justify-center border border-neutral-300 rounded hover:bg-neutral-200 transition-colors"
                >
                    <HiXMark
                        size={12}
                        
                    />
                </button>
            </div>
        </div>
    </div>
)}
    <div>
        {filteredChannels.map(ch => (
            <div
    key={ch._id}
    onClick={() => setSelectedChannel(ch)}
    className={`flex items-center gap-3 px-3 py-1 rounded-md cursor-pointer transition-all ${
        selectedChannel?._id === ch._id
            ? "bg-neutral-200 text-black"
            : "hover:bg-neutral-100 text-black/70"
    }`}
>
    <span className="text-sm">
        <span className="text-md me-1">#</span> {ch.name}
    </span>
</div>
          ))}
    </div>
</div>

                    {/* Active DMs */}
                    <div>
                        <div className="text-xs text-black/60 mb-3 px-2">Direct Messages</div>
                        <div className="space-y-1">
                            {activeDMs.map(dm => {
                                const receiver = getDMReceiver(dm);
                                return (
                                    <div key={dm._id} onClick={() => setSelectedChannel(dm)}
                                        className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-all ${selectedChannel?._id === dm._id ? "bg-neutral-200" : "hover:bg-neutral-100"}`}>
                                        <InitialAvatar name={receiver?.firstName} size={28} />
                                        <div className="flex-1 min-w-0 flex items-center justify-between">
                                            <p className="text-sm truncate">{receiver?.firstName} {receiver?.lastName}</p>
                                            
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Start New DM */}
                    {filteredUsers.length > 0 && (
                        <div>
                            <div className="text-xs  text-black/60 mb-3 px-2">People</div>
                            <div className="space-y-1 pb-6">
                                {filteredUsers.map(user => (
                                    <div key={user._id} onClick={() => startDM(user)}
                                        className="flex items-center gap-3 px-2 py-1 rounded-xl cursor-pointer">
                                        <InitialAvatar name={user.firstName} size={28} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm truncate">{user.firstName} {user.lastName}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedChannel ? (
                    <>
                        <div className="h-15 px-8 flex items-center justify-between border-b border-neutral-100 bg-white/80 backdrop-blur-md z-10">
                            <div className="flex items-center gap-4">
                                {selectedChannel.isDM ? (
                                    <InitialAvatar name={getDMReceiver(selectedChannel)?.firstName} size={32} />
                                ) : (
                                    <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-500">
                                        <HiHashtag size={20} />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-sm">
                                        {selectedChannel.isDM 
                                            ? `${getDMReceiver(selectedChannel)?.firstName || ''} ${getDMReceiver(selectedChannel)?.lastName || ''}`
                                            : selectedChannel.name}
                                    </h3>
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                        <p className="text-xs text-neutral-400">Active Now</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Messages List */}
<div className="flex-1 overflow-y-auto p-8 space-y-1 bg-neutral-100 custom-scroll">   {/* Reduced overall spacing */}
    {loading && messages.length === 0 ? (
        <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-300 border-t-neutral-600"></div>
        </div>
    ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-fit text-neutral-400 space-y-4">
            <p className="text-sm text-neutral-500">No messages yet. Send a greeting!</p>
        </div>
    ) : (
        messages.map((msg, index) => {
            const msgDate = new Date(msg.createdAt).toDateString();
            const prevMsgDate = index > 0 ? new Date(messages[index - 1].createdAt).toDateString() : null;
            const isNewDay = msgDate !== prevMsgDate;

            const sId = msg.sender?._id || msg.sender?.id || msg.sender;
            const senderId = String(sId || "").trim();
            const myId = String(currentUserId || "").trim();
            const isMyMessage = senderId === myId;

            const prevMsg = messages[index - 1];
            const prevSenderId = prevMsg 
                ? String(prevMsg.sender?._id || prevMsg.sender?.id || prevMsg.sender || "").trim()
                : null;

            const isNewGroup = !prevMsg || prevSenderId !== senderId;
            const showName = !isMyMessage && isNewGroup;

            return (
                <React.Fragment key={msg._id}>
                    {isNewDay && (
                        <div className="flex justify-center my-6">
                            <div className="bg-amber-300/30  px-2 py-1 rounded text-xs text-amber-900">
                                {formatMessageDate(msg.createdAt)}
                            </div>
                        </div>
                    )}
                    <div 
                        className={`flex ${isMyMessage ? "justify-end" : "justify-start"} ${isNewGroup ? "mt-5" : "mt-0.5"}`}
                    >
                        <div className={`max-w-[65%] flex flex-col ${isMyMessage ? "items-end" : "items-start"}`}>
                            
                            {/* Sender Name - Only at start of group */}
                            {showName && (
                                <p className="text-[11px] text-neutral-400 mb-1.5 ml-1">
                                    {msg.sender?.firstName} {msg.sender?.lastName}
                                </p>
                            )}

                            <div className={`group relative px-3 py-2.5 rounded-2xl text-sm transition-all ${
                                isMyMessage 
                                    ? "bg-neutral-300 rounded-br-none" 
                                    : "bg-white border border-neutral-200 rounded-bl-none"
                            }`}>
                                <p>{renderMessageText(msg.text)}</p>
                                
                                {/* Time inside bubble */}
                                <span className={`block text-[10px] mt-1 text-right ${
                                    isMyMessage ? "text-neutral-600" : "text-neutral-400"
                                }`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>
                </React.Fragment>
            );
        })
    )}
    <div ref={messagesEndRef} />
</div>

                      

                        <div className="px-4 pb-4 bg-neutral-100 relative">
                            {showMentions && mentionMembers.length > 0 && (
                                <div className="absolute bottom-full w-fit custom-scroll-hidden left-auto bg-white border border-neutral-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 p-1">
                                    {mentionMembers.map((member, idx) => {
                                        const isSelected = idx === selectedMentionIndex;
                                        return (
                                            <div
                                                key={member._id || member.id}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    selectMember(member);
                                                }}
                                                className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                                                    isSelected ? "bg-indigo-50 text-indigo-700 " : "hover:bg-neutral-50 text-neutral-700"
                                                }`}
                                            >
                                                <InitialAvatar name={member.firstName} size={28} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm truncate">
                                                        {member.firstName} {member.lastName}
                                                    </p>
                                                    {member.username && (
                                                        <p className="text-[11px] text-neutral-400 truncate">
                                                            @{member.username}
                                                        </p>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                                                        Press Enter
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <form onSubmit={sendMessage} className="flex items-center gap-3 bg-neutral-300 p-2 ps-4 rounded-xl">
                                
                                <input
                                    ref={inputRef}
                                    value={newMessage}
                                    onChange={handleInputChange}
                                    onKeyDown={handleInputKeyDown}
                                    placeholder={`Message ${selectedChannel.isDM ? getDMReceiver(selectedChannel)?.firstName : selectedChannel.name}...`}
                                    className="flex-1 bg-transparent outline-none text-sm"
                                />
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim() || sending}
                                    className="bg-black text-white w-8 h-8 rounded-lg disabled:opacity-50 flex items-center justify-center"
                                >
                                    <IoArrowForward size={18} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 bg-neutral-100" />
                )}
            </div>
        </div>
    );
};

export default Inbox;