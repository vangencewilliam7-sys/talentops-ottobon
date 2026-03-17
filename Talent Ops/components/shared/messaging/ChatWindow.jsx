import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    MessageCircle, Users, Search, X, Trash2, Settings,
    UserPlus, Edit2, Shield, UserMinus, Reply, Smile,
    BarChart2, CheckCircle2, Info, ChevronUp, ChevronDown
} from 'lucide-react';
import MessageRenderer from './renderers/MessageRenderer';
import ReactionDetailsModal from './ReactionDetailsModal';
import VoteDetailsModal from './VoteDetailsModal';
import MembersModal from './MembersModal';
import AddMemberModal from './AddMemberModal';
import RenameGroupModal from './RenameGroupModal';
import DocumentViewer from '../DocumentViewer';

// ── Helper: render message content with clickable links & newline support ──


// ── Helper: format date divider ──
const formatDividerDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
};

// ── Helper: highlight matching text ──
const HighlightText = ({ text, query }) => {
    if (!query || !text) return <>{text}</>;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} style={{ background: '#fbbf24', color: '#1f2937', borderRadius: '2px', padding: '0 1px' }}>{part}</mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </>
    );
};




// ══════════════════════════════════════════════
//  ChatWindow Component
// ══════════════════════════════════════════════
const ChatWindow = ({
    // Conversation & messages
    selectedConversation,
    messages,
    currentUserId,
    orgUsers,
    isCurrentUserAdmin,
    currentMembers,
    messageReactions,
    allPollVotes,
    loading,
    errorMessage,
    setErrorMessage,
    replyingTo,
    setReplyingTo,
    // Callbacks from parent
    onReaction,
    onVote,
    onDeleteForMe,
    onDeleteForEveryone,
    groupActions = {}
}) => {
    const {
        onFetchMembers,
        onAddMember,
        onRemoveMember,
        onPromoteToAdmin,
        onDemoteFromAdmin,
        onRenameGroup,
        onDeleteGroup,
        onLeaveGroup
    } = groupActions;
    // ── Local state (owned by ChatWindow) ──
    const [hoveredMessageId, setHoveredMessageId] = useState(null);
    const [showReactionPicker, setShowReactionPicker] = useState(null);
    const [viewingReactionsFor, setViewingReactionsFor] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [messageSearchQuery, setMessageSearchQuery] = useState('');
    const [searchResultIndex, setSearchResultIndex] = useState(0);
    const [highlightedMessageId, setHighlightedMessageId] = useState(null);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [showVoteDetails, setShowVoteDetails] = useState(null);

    // Document Viewer state
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewFileName, setPreviewFileName] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    const messagesEndRef = useRef(null);
    const messageRefs = useRef({});
    const messagesContainerRef = useRef(null);
    const searchInputRef = useRef(null);
    const prevConversationId = useRef(null);

    // Auto-scroll to bottom (latest messages)
    useEffect(() => {
        const isNewConversation = selectedConversation?.id !== prevConversationId.current;
        if (isNewConversation) {
            prevConversationId.current = selectedConversation?.id;
            // Instant scroll when opening a new conversation
            setTimeout(() => {
                if (messagesContainerRef.current) {
                    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                }
            }, 50);
        } else {
            // Smooth scroll for new messages in current conversation
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, selectedConversation]);

    // Helper
    const getSenderName = (senderId) => {
        const user = orgUsers.find(u => u.id === senderId);
        return user?.full_name || user?.email || 'Unknown';
    };

    const handleFetchMembers = async () => {
        await onFetchMembers();
        setShowMembersModal(true);
    };

    const handleReaction = (messageId, emoji) => {
        setShowReactionPicker(null);
        onReaction(messageId, emoji);
    };

    const handleRenameGroup = async () => {
        if (!newGroupName.trim()) {
            setErrorMessage('Group name cannot be empty');
            return;
        }
        await onRenameGroup(newGroupName);
        setShowRenameModal(false);
        setNewGroupName('');
    };

    // ── Search logic ──
    const searchResultIds = messageSearchQuery
        ? messages
            .filter(msg => {
                const query = messageSearchQuery.toLowerCase();
                const content = (msg.content || '').toLowerCase();
                const pollQuestion = (msg.poll_question || '').toLowerCase();
                const pollOptions = (msg.poll_options || []).join(' ').toLowerCase();
                const senderName = getSenderName(msg.sender_user_id).toLowerCase();
                return content.includes(query) || pollQuestion.includes(query) || pollOptions.includes(query) || senderName.includes(query);
            })
            .map(msg => msg.id)
        : [];

    // Update highlighted message when search or index changes
    useEffect(() => {
        if (searchResultIds.length > 0 && searchResultIndex >= 0) {
            const targetId = searchResultIds[searchResultIndex];
            setHighlightedMessageId(targetId);
            // Scroll into view
            setTimeout(() => {
                const el = messageRefs.current[targetId];
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        } else {
            setHighlightedMessageId(null);
        }
    }, [searchResultIndex, messageSearchQuery, searchResultIds.length]);

    // Reset index when query changes
    useEffect(() => {
        setSearchResultIndex(0);
    }, [messageSearchQuery]);

    const goToNextResult = useCallback(() => {
        if (searchResultIds.length === 0) return;
        setSearchResultIndex(prev => (prev + 1) % searchResultIds.length);
    }, [searchResultIds.length]);

    const goToPrevResult = useCallback(() => {
        if (searchResultIds.length === 0) return;
        setSearchResultIndex(prev => (prev - 1 + searchResultIds.length) % searchResultIds.length);
    }, [searchResultIds.length]);

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
                goToPrevResult();
            } else {
                goToNextResult();
            }
        }
        if (e.key === 'Escape') {
            setShowSearch(false);
            setMessageSearchQuery('');
            setHighlightedMessageId(null);
        }
    };

    if (!selectedConversation) {
        return (
            <div className="message-thread" style={{ flex: 1, minHeight: 0 }}>
                <div className="no-conversation-selected">
                    <MessageCircle size={64} />
                    <h3>Select a conversation</h3>
                    <p>Choose a conversation from the list to start messaging</p>
                </div>
            </div>
        );
    }

    return (
        <div className="message-thread" style={{ flex: 1, minHeight: 0 }}>
            <>
                {/* ════════ Thread Header ════════ */}
                <div className="thread-header">
                    <div className="thread-info">
                        <h3>{selectedConversation.name || selectedConversation.otherUser?.full_name || 'Conversation'}</h3>
                        <span className="thread-type">
                            {selectedConversation.type === 'dm' ? 'Direct Message' :
                                selectedConversation.type === 'team' ? 'Team Chat' : 'Organization'}
                            {isCurrentUserAdmin && selectedConversation.type === 'team' && (
                                <span style={{ marginLeft: '8px', color: '#3b82f6', fontSize: '11px' }}>• Admin</span>
                            )}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={() => { setShowSearch(!showSearch); if (showSearch) { setMessageSearchQuery(''); setHighlightedMessageId(null); } }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                background: showSearch ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: '#ffffff',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                                backdropFilter: 'blur(4px)'
                            }}
                        >
                            <Search size={14} />
                            {showSearch ? 'Close Search' : 'Search'}
                        </button>
                        {(selectedConversation.type === 'team' || selectedConversation.type === 'everyone') && (
                            <button onClick={handleFetchMembers}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    color: '#ffffff',
                                    fontWeight: 500,
                                    backdropFilter: 'blur(4px)'
                                }}>
                                <Users size={14} /> Members
                            </button>
                        )}
                        {isCurrentUserAdmin && selectedConversation.type === 'team' && (
                            <button onClick={() => setShowGroupSettings(!showGroupSettings)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(59, 130, 246, 0.5)',
                                    background: showGroupSettings ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    color: '#ffffff',
                                    fontWeight: 600,
                                    backdropFilter: 'blur(4px)'
                                }}>
                                <Settings size={14} /> Settings
                            </button>
                        )}
                    </div>
                </div>

                {/* ════════ Search Bar ════════ */}
                {showSearch && (
                    <div style={{ padding: '12px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                            <input type="text" placeholder="Search messages, names..." value={messageSearchQuery}
                                ref={searchInputRef}
                                onChange={(e) => setMessageSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                style={{ width: '100%', padding: '10px 12px 10px 40px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', background: '#ffffff', transition: 'border-color 0.2s' }}
                                autoFocus />
                            {messageSearchQuery && (
                                <button onClick={() => { setMessageSearchQuery(''); setHighlightedMessageId(null); }}
                                    style={{ position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        {messageSearchQuery && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                <span style={{ fontSize: '13px', color: searchResultIds.length > 0 ? '#374151' : '#ef4444', fontWeight: 500 }}>
                                    {searchResultIds.length > 0 ? `${searchResultIndex + 1} of ${searchResultIds.length}` : 'No results'}
                                </span>
                                <button onClick={goToPrevResult} disabled={searchResultIds.length === 0}
                                    title="Previous (Shift+Enter)"
                                    style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: searchResultIds.length > 0 ? 'pointer' : 'not-allowed', padding: '4px', display: 'flex', color: searchResultIds.length > 0 ? '#374151' : '#d1d5db', transition: 'all 0.15s' }}>
                                    <ChevronUp size={16} />
                                </button>
                                <button onClick={goToNextResult} disabled={searchResultIds.length === 0}
                                    title="Next (Enter)"
                                    style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: searchResultIds.length > 0 ? 'pointer' : 'not-allowed', padding: '4px', display: 'flex', color: searchResultIds.length > 0 ? '#374151' : '#d1d5db', transition: 'all 0.15s' }}>
                                    <ChevronDown size={16} />
                                </button>
                            </div>
                        )}
                        {!messageSearchQuery && (
                            <div style={{ fontSize: '12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                Press Enter to navigate
                            </div>
                        )}
                    </div>
                )}

                {/* ════════ Group Settings Panel (Admin Only) ════════ */}
                {showGroupSettings && isCurrentUserAdmin && selectedConversation.type === 'team' && (
                    <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <button onClick={() => setShowAddMemberModal(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1px solid #10b981', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#059669', fontWeight: 600, transition: 'all 0.2s' }}>
                            <UserPlus size={16} /> Add Member
                        </button>
                        <button onClick={() => { setNewGroupName(selectedConversation.name); setShowRenameModal(true); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1px solid #3b82f6', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#3b82f6', fontWeight: 600, transition: 'all 0.2s' }}>
                            <Edit2 size={16} /> Rename Group
                        </button>
                        <button onClick={onDeleteGroup}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '6px', border: '1px solid #ef4444', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#dc2626', fontWeight: 600, transition: 'all 0.2s' }}>
                            <Trash2 size={16} /> Delete Group
                        </button>
                    </div>
                )}

                {/* ════════ Messages Container ════════ */}
                <div className="messages-container" ref={messagesContainerRef}>
                    {selectedConversation.temp ? (
                        <div className="empty-messages" style={{ textAlign: 'center', padding: '2rem' }}>
                            <MessageCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5, color: '#6366f1' }} />
                            <h4 style={{ marginBottom: '0.5rem', color: '#1f2937' }}>
                                Chat with {selectedConversation.otherUser?.full_name || 'User'}
                            </h4>
                            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                                Send a message to start the conversation!
                            </p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="empty-messages">
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    ) : (
                        (() => {
                            return messages.map((msg, index) => {
                                const prevMsg = messages[index - 1];
                                const prevDate = prevMsg ? new Date(prevMsg.created_at).toDateString() : null;
                                const currDate = new Date(msg.created_at).toDateString();
                                const isNewDay = currDate !== prevDate;
                                const isSearchMatch = messageSearchQuery && searchResultIds.includes(msg.id);
                                const isCurrentResult = highlightedMessageId === msg.id;

                                return (
                                    <React.Fragment key={msg.id}>
                                        {isNewDay && (
                                            <div className="date-divider" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px 0 12px 0', position: 'relative' }}>
                                                <div style={{ height: '1px', background: '#e5e7eb', width: '100%', position: 'absolute' }}></div>
                                                <span style={{ background: '#f9fafb', padding: '0 16px', fontSize: '11px', color: '#6b7280', fontWeight: 600, zIndex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {formatDividerDate(msg.created_at)}
                                                </span>
                                            </div>
                                        )}
                                        <div
                                            ref={el => { if (el) messageRefs.current[msg.id] = el; }}
                                            className={`message ${msg.sender_user_id === currentUserId ? 'sent' : 'received'}`}
                                            style={{
                                                position: 'relative',
                                                marginBottom: '8px',
                                                ...(isCurrentResult ? {
                                                    background: 'rgba(251, 191, 36, 0.2)',
                                                    borderLeft: '3px solid #f59e0b',
                                                    borderRadius: '8px',
                                                    padding: '4px',
                                                    transition: 'all 0.3s ease'
                                                } : isSearchMatch ? {
                                                    background: 'rgba(251, 191, 36, 0.08)',
                                                    borderRadius: '8px',
                                                    padding: '4px',
                                                    transition: 'all 0.3s ease'
                                                } : messageSearchQuery ? {
                                                    opacity: 0.4,
                                                    transition: 'all 0.3s ease'
                                                } : {})
                                            }}
                                            onMouseEnter={() => setHoveredMessageId(msg.id)}
                                            onMouseLeave={() => setHoveredMessageId(null)}
                                        >
                                            <div className="message-bubble" style={{ position: 'relative' }}>
                                                {/* Sender Name for Group Chats */}
                                                {(selectedConversation.type === 'team' || selectedConversation.type === 'everyone') && msg.sender_user_id !== currentUserId && (
                                                    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px', marginLeft: '2px', fontWeight: 600 }}>
                                                        {getSenderName(msg.sender_user_id)}
                                                    </div>
                                                )}

                                                {/* Replied Message Context */}
                                                {msg.replied_message_content && (
                                                    <div style={{ padding: '6px 10px', background: 'rgba(0,0,0,0.04)', borderLeft: '3px solid #cbd5e1', marginBottom: '6px', borderRadius: '4px', fontSize: '12px' }}>
                                                        <div style={{ color: '#64748b', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                                            <Reply size={10} />
                                                            {msg.replied_message_sender_name || 'User'}
                                                        </div>
                                                        <div style={{ color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                                            {msg.replied_message_content}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Message Actions Hover + Reaction Picker */}
                                                {hoveredMessageId === msg.id && !msg.is_deleted && (
                                                    <div style={{ position: 'absolute', top: '-32px', right: msg.sender_user_id === currentUserId ? '4px' : 'auto', left: msg.sender_user_id !== currentUserId ? '4px' : 'auto', zIndex: 100 }}>
                                                        {/* Reaction Picker Popup - above the action bar */}
                                                        {showReactionPicker === msg.id && (
                                                            <div style={{ position: 'absolute', bottom: '100%', right: msg.sender_user_id === currentUserId ? '0' : 'auto', left: msg.sender_user_id !== currentUserId ? '0' : 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '24px', padding: '6px 10px', display: 'flex', gap: '2px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 101, marginBottom: '6px', whiteSpace: 'nowrap' }}>
                                                                {['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏'].map(emoji => (
                                                                    <button key={emoji}
                                                                        onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                                                        style={{ padding: '6px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', borderRadius: '50%', transition: 'all 0.15s', lineHeight: 1 }}
                                                                        onMouseEnter={(e) => { e.target.style.transform = 'scale(1.3)'; e.target.style.background = '#f1f5f9'; }}
                                                                        onMouseLeave={(e) => { e.target.style.transform = 'scale(1)'; e.target.style.background = 'none'; }}>
                                                                        {emoji}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {/* Action buttons bar */}
                                                        <div style={{ background: 'white', borderRadius: '24px', padding: '4px 8px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: '2px', border: '1px solid #e5e7eb' }}>
                                                            <button
                                                                onClick={() => setReplyingTo({ id: msg.id, content: msg.content, sender_name: msg.sender_user_id === currentUserId ? 'You' : (getSenderName(msg.sender_user_id) || 'User') })}
                                                                title="Reply"
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#64748b', display: 'flex', borderRadius: '50%', transition: 'all 0.2s' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#3b82f6'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}
                                                            >
                                                                <Reply size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                                                                title="React"
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#64748b', display: 'flex', borderRadius: '50%', transition: 'all 0.2s' }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#eab308'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}
                                                            >
                                                                <Smile size={16} />
                                                            </button>
                                                            {messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).length > 0 && (
                                                                <button onClick={() => setViewingReactionsFor(msg.id)} title="View Reactions"
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#64748b', display: 'flex', borderRadius: '50%', transition: 'all 0.2s' }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#3b82f6'; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}>
                                                                    <Info size={16} />
                                                                </button>
                                                            )}

                                                            {/* Delete Actions */}
                                                            {msg.sender_user_id === currentUserId && (new Date() - new Date(msg.created_at)) < 5 * 60 * 1000 && (
                                                                <>
                                                                    <div style={{ width: '1px', height: '18px', background: '#e2e8f0', margin: '0 6px' }} />
                                                                    <button onClick={() => onDeleteForMe(msg.id)} title="Delete for me"
                                                                        style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: '#64748b', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '12px', transition: 'all 0.2s' }}
                                                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
                                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}>
                                                                        <Trash2 size={13} /> Me
                                                                    </button>
                                                                    <button onClick={() => onDeleteForEveryone(msg.id)} title="Delete for everyone"
                                                                        style={{ background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer', color: '#ef4444', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '12px', transition: 'all 0.2s' }}
                                                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#b91c1c'; }}
                                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#ef4444'; }}>
                                                                        <Trash2 size={13} /> All
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="message-content" style={{ fontStyle: msg.is_deleted ? 'italic' : 'normal', color: msg.is_deleted ? '#94a3b8' : 'inherit' }}>
                                                    {msg.is_deleted && <Trash2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />}
                                                    {msg.is_deleted ? msg.content : (
                                                        <MessageRenderer
                                                            message={msg}
                                                            currentUserId={currentUserId}
                                                            allPollVotes={allPollVotes}
                                                            onVote={onVote}
                                                            onViewVotes={setShowVoteDetails}
                                                        />
                                                    )}
                                                </div>
                                                {msg.attachments && msg.attachments.length > 0 && (
                                                    <div className="message-attachments">
                                                        {msg.attachments.map(att => (
                                                            <button 
                                                                key={att.id} 
                                                                onClick={() => {
                                                                    setPreviewUrl(att.url);
                                                                    setPreviewFileName(att.file_name);
                                                                    setShowPreview(true);
                                                                }} 
                                                                title="View Attachment"
                                                                className="attachment-link"
                                                                style={{ border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', padding: '0', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
                                                            >
                                                                📎 {att.file_name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Reactions Display */}
                                                {!msg.is_deleted && messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).length > 0 && (
                                                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap', justifyContent: msg.sender_user_id === currentUserId ? 'flex-end' : 'flex-start', padding: '0 4px' }}>
                                                        {Object.entries(messageReactions[msg.id]).map(([emoji, data]) => {
                                                            const isSelf = data.users.some(u => u.user_id === currentUserId);
                                                            return (
                                                                <div key={emoji}
                                                                    onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                                                    title={data.users.map(u => u.name).join(', ')}
                                                                    style={{ display: 'inline-flex', alignItems: 'center', padding: data.count > 1 ? '3px 10px' : '3px 8px', background: isSelf ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(4px)', border: isSelf ? '1.5px solid #3b82f6' : '1px solid #e2e8f0', borderRadius: '20px', fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.04)', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', transform: 'translateY(0)' }}
                                                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.06)'; }}
                                                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)'; }}>
                                                                    <span style={{ transform: 'scale(1.1)', display: 'inline-block' }}>{emoji}</span>
                                                                    {data.count > 1 && (
                                                                        <span style={{ fontSize: '11px', color: isSelf ? '#1d4ed8' : '#64748b', fontWeight: 700, marginLeft: '4px' }}>{data.count}</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                <div className="message-time">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {msg.sender_user_id === currentUserId && (
                                                        <span style={{ marginLeft: '4px', display: 'inline-flex', verticalAlign: 'middle' }}>
                                                            <svg width="16" height="11" viewBox="0 0 16 11" fill="none" style={{ color: '#3b82f6' }}>
                                                                <path d="M11.071 0.929L4.5 7.5L1.929 4.929" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                <path d="M14.071 0.929L7.5 7.5L6.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            });
                        })()
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </>

            {/* ════════ View Members Modal ════════ */}
            {showMembersModal && (
                <MembersModal
                    members={currentMembers}
                    currentUserId={currentUserId}
                    isCurrentUserAdmin={isCurrentUserAdmin}
                    isTeamChat={selectedConversation?.type === 'team'}
                    onClose={() => setShowMembersModal(false)}
                    onPromote={onPromoteToAdmin}
                    onDemote={onDemoteFromAdmin}
                    onRemove={onRemoveMember}
                    onLeave={onLeaveGroup}
                />
            )}

            {/* ════════ Add Member Modal ════════ */}
            {showAddMemberModal && (
                <AddMemberModal
                    orgUsers={orgUsers}
                    currentMembers={currentMembers}
                    errorMessage={errorMessage}
                    onClose={() => setShowAddMemberModal(false)}
                    onAdd={onAddMember}
                />
            )}

            {/* ════════ Rename Group Modal ════════ */}
            {showRenameModal && (
                <RenameGroupModal
                    newGroupName={newGroupName}
                    setNewGroupName={setNewGroupName}
                    errorMessage={errorMessage}
                    setErrorMessage={setErrorMessage}
                    onClose={() => setShowRenameModal(false)}
                    onRename={handleRenameGroup}
                />
            )}

            {/* ════════ Reaction Details Modal ════════ */}
            {viewingReactionsFor && (
                <ReactionDetailsModal
                    reactions={messageReactions[viewingReactionsFor]}
                    onClose={() => setViewingReactionsFor(null)}
                    currentUserId={currentUserId}
                />
            )}

            {/* ════════ Vote Details Modal ════════ */}
            {showVoteDetails && (
                <VoteDetailsModal
                    message={messages.find(m => m.id === showVoteDetails)}
                    votes={allPollVotes[showVoteDetails] || []}
                    onClose={() => setShowVoteDetails(null)}
                />
            )}

            {/* ════════ Document Preview Modal ════════ */}
            {
                showPreview && previewUrl && (
                    <DocumentViewer
                        url={previewUrl}
                        fileName={previewFileName || "Attachment"}
                        onClose={() => { setShowPreview(false); setPreviewUrl(''); setPreviewFileName(''); }}
                    />
                )
            }
        </div>
    );
};

export default ChatWindow;
