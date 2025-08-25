// src/components/FindBloodBank.js
import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase'; // adjust path if needed
import { useNavigate } from 'react-router-dom';

const FindBloodBank = () => {
  const [bloodBanks, setBloodBanks] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const navigate = useNavigate();

  // Fetch data from Firestore
  useEffect(() => {
    const fetchBloodBanks = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'BloodBanks'));
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBloodBanks(data);
      } catch (error) {
        console.error('Error fetching blood banks:', error);
      }
    };
    fetchBloodBanks();
  }, []);

  // Filter results
  const filteredBloodBanks = bloodBanks.filter(bank => {
    const matchesSearch = bank.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter ? bank.bloodGroups?.includes(filter) : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Find Nearest Blood Bank</h1>

      {/* Search bar */}
      <input
        type="text"
        placeholder="Search by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border p-2 rounded w-full mb-3"
      />

      {/* Dropdown filter */}
      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="border p-2 rounded w-full mb-4"
      >
        <option value="">Filter by Blood Group</option>
        <option value="A+">A+</option>
        <option value="A-">A-</option>
        <option value="B+">B+</option>
        <option value="B-">B-</option>
        <option value="O+">O+</option>
        <option value="O-">O-</option>
        <option value="AB+">AB+</option>
        <option value="AB-">AB-</option>
      </select>

      {/* List of results */}
      <ul className="space-y-3">
        {filteredBloodBanks.map((bank) => (
          <li
            key={bank.id}
            onClick={() => navigate(`/bloodbank/${bank.id}`)}
            className="p-3 border rounded cursor-pointer hover:bg-gray-100"
          >
            <h2 className="font-semibold">{bank.name}</h2>
            <p className="text-sm text-gray-600">{bank.location}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FindBloodBank;