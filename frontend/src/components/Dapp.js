import React, { useState } from 'react';
import { ethers } from 'ethers';
import './Dapp.css';

export const Dapp = () => {
  // State management
  const [state, setState] = useState({
    selectedAddress: null,
    balance: null,
    events: [],
    networkError: null,
    transactionError: null,
  });

  // Event creation form state
  const [eventForm, setEventForm] = useState({
    name: "",
    symbol: "",
    numTickets: 0,
    price: 0,
    canBeResold: true,
    royaltyPercent: 0,
  });

  // Tab state
  const [activeTab, setActiveTab] = useState('create');

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const [account] = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balance = ethers.utils.formatEther(
          await provider.getBalance(account)
        );
        
        setState(prev => ({
          ...prev,
          selectedAddress: account,
          balance: balance
        }));

        // Listen for account changes
        window.ethereum.on("accountsChanged", ([newAccount]) => {
          setState(prev => ({
            ...prev,
            selectedAddress: newAccount,
          }));
        });
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        networkError: error.message
      }));
    }
  };

  // Create new event
  const createEvent = async (e) => {
    e.preventDefault();
    try {
      const newEvent = {
        id: state.events.length + 1,
        ...eventForm,
        owner: state.selectedAddress,
        ticketsSold: 0,
        tickets: []
      };

      setState(prev => ({
        ...prev,
        events: [...prev.events, newEvent]
      }));

      setEventForm({
        name: "",
        symbol: "",
        numTickets: 0,
        price: 0,
        canBeResold: true,
        royaltyPercent: 0,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        transactionError: error.message
      }));
    }
  };

  // Buy ticket
  const buyTicket = async (eventId) => {
    try {
      const eventIndex = state.events.findIndex(e => e.id === eventId);
      if (eventIndex === -1) return;

      const event = state.events[eventIndex];
      if (event.ticketsSold >= event.numTickets) {
        throw new Error("Event sold out");
      }

      const newTicket = {
        id: event.tickets.length,
        owner: state.selectedAddress,
        used: false,
        forSale: false,
        resalePrice: 0
      };

      const updatedEvents = [...state.events];
      updatedEvents[eventIndex] = {
        ...event,
        ticketsSold: event.ticketsSold + 1,
        tickets: [...event.tickets, newTicket]
      };

      setState(prev => ({
        ...prev,
        events: updatedEvents
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        transactionError: error.message
      }));
    }
  };

  // Get user's tickets
  const getMyTickets = () => {
    return state.events.flatMap(event => 
      event.tickets.filter(ticket => 
        ticket.owner === state.selectedAddress
      ).map(ticket => ({
        ...ticket,
        eventName: event.name,
        eventId: event.id
      }))
    );
  };

  if (!window.ethereum) {
    return (
      <div className="error-message">
        Please install MetaMask to use this dApp
      </div>
    );
  }

  if (!state.selectedAddress) {
    return (
      <div className="connect-wallet-container">
        <button className="connect-button" onClick={connectWallet}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>TicketChain</h1>
        <div className="account-info">
          <p>Account: {state.selectedAddress}</p>
          <p>Balance: {state.balance} ETH</p>
        </div>
      </div>

      <div className="tabs">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Event
          </button>
          <button
            className={`tab-button ${activeTab === 'buy' ? 'active' : ''}`}
            onClick={() => setActiveTab('buy')}
          >
            Buy Tickets
          </button>
          <button
            className={`tab-button ${activeTab === 'mytickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('mytickets')}
          >
            My Tickets
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'create' && (
            <div className="create-event">
              <h2>Create New Event</h2>
              <form onSubmit={createEvent} className="event-form">
                <div className="form-group">
                  <label htmlFor="name">Event Name</label>
                  <input
                    id="name"
                    value={eventForm.name}
                    onChange={e => setEventForm(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="numTickets">Number of Tickets</label>
                  <input
                    id="numTickets"
                    type="number"
                    value={eventForm.numTickets}
                    onChange={e => setEventForm(prev => ({
                      ...prev,
                      numTickets: parseInt(e.target.value)
                    }))}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="price">Price (ETH)</label>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    value={eventForm.price}
                    onChange={e => setEventForm(prev => ({
                      ...prev,
                      price: parseFloat(e.target.value)
                    }))}
                  />
                </div>
                <button type="submit" className="submit-button">Create Event</button>
              </form>
            </div>
          )}

          {activeTab === 'buy' && (
            <div className="buy-tickets">
              <h2>Available Events</h2>
              <div className="events-list">
                {state.events.map(event => (
                  <div key={event.id} className="event-card">
                    <h3>{event.name}</h3>
                    <p>Available: {event.numTickets - event.ticketsSold}</p>
                    <p>Price: {event.price} ETH</p>
                    <button 
                      onClick={() => buyTicket(event.id)}
                      disabled={event.ticketsSold >= event.numTickets}
                      className="buy-button"
                    >
                      Buy Ticket
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'mytickets' && (
            <div className="my-tickets">
              <h2>My Tickets</h2>
              <div className="tickets-list">
                {getMyTickets().map(ticket => (
                  <div key={`${ticket.eventId}-${ticket.id}`} className="ticket-card">
                    <h3>{ticket.eventName}</h3>
                    <p>Ticket #{ticket.id}</p>
                    <p>Status: {ticket.used ? 'Used' : 'Valid'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {state.transactionError && (
        <div className="error-message">
          {state.transactionError}
        </div>
      )}
    </div>
  );
};
