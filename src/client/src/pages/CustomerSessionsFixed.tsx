import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Calendar, 
  Filter,
  Search,
  Eye,
  Download,
  Heart,
  ShoppingBag,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { CustomerLayout } from '../components/CustomerLayout';
import { authStorage } from '../services/api';
import { fitSessionsAPI, FitSessionWithProducts } from '../services/fitSessionsAPI';
import { pickDisplayImage } from '../utils/image';

const CustomerSessions: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [sessions, setSessions] = useState<FitSessionWithProducts[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<FitSessionWithProducts[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessionsData = async () => {
      // Check if user is authenticated
      const token = authStorage.getToken();
      const userData = authStorage.getUser();
      
      if (!token || !userData) {
        navigate('/login/consumer');
        return;
      }
      
      setUser(userData);
      
      try {
        // Load real FiT sessions from Supabase
        const sessionsData = await fitSessionsAPI.getUserSessions();
        setSessions(sessionsData);
        setFilteredSessions(sessionsData);
      } catch (error) {
        console.error('Error loading sessions:', error);
        setSessions([]);
        setFilteredSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSessionsData();
  }, [navigate]);

  // Filter sessions based on search term, status, and category
  useEffect(() => {
    let filtered = sessions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(session => {
        const firstProduct = session.products?.[0];
        const productName = firstProduct?.product_name || '';
        const retailerName = session.retailer?.shop_name || '';
        return productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               retailerName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(session => session.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(session => session.category === categoryFilter);
    }

    setFilteredSessions(filtered);
  }, [sessions, searchTerm, statusFilter, categoryFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-100';
      case 'PROCESSING': return 'text-yellow-600 bg-yellow-100';
      case 'FAILED': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Voltooid';
      case 'PROCESSING': return 'Verwerken';
      case 'FAILED': return 'Mislukt';
      default: return 'Onbekend';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="h-4 w-4" />;
      case 'PROCESSING': return <Clock className="h-4 w-4" />;
      case 'FAILED': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const toggleFavorite = (sessionId: string) => {
    // TODO: Implement favorite toggle functionality
    console.log('Toggle favorite for session:', sessionId);
  };

  if (!user || loading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mijn FiT Sessies</h1>
          <p className="mt-1 text-sm text-gray-600">
            Overzicht van al je virtuele paskamer sessies
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Zoek sessies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Alle statussen</option>
                  <option value="COMPLETED">Voltooid</option>
                  <option value="PROCESSING">Verwerken</option>
                  <option value="FAILED">Mislukt</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Alle categorieën</option>
                  <option value="FASHION">Kleding & Mode</option>
                  <option value="SHOES">Schoenen & Footwear</option>
                  <option value="BIKES">Fietsen & E-bikes</option>
                  <option value="MOTORS">Motoren & Scooters</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sessions Grid */}
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Geen sessies gevonden</h3>
            <p className="mt-1 text-sm text-gray-500">
              {sessions.length === 0 
                ? 'Je hebt nog geen FiT sessies. Start je eerste sessie bij een van onze partners!'
                : 'Geen sessies gevonden die voldoen aan je filters.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map((session) => {
              const firstProduct = session.products?.[0];
              const productName = firstProduct?.product_name || 'Onbekend product';
              const productPrice = firstProduct?.product_price || '';
              const retailerName = session.retailer?.shop_name || 'Onbekende winkel';
              const productImage = pickDisplayImage(
                session.status,
                session.generated_image_url,
                firstProduct?.product_image_url
              );

              return (
                <div key={session.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
                  <div className="relative">
                    {productImage ? (
                      <img 
                        src={productImage} 
                        alt={productName}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <ShoppingBag className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {getStatusIcon(session.status)}
                        <span className="ml-1">{getStatusText(session.status)}</span>
                      </span>
                    </div>

                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(session.id)}
                      className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm hover:bg-gray-50"
                    >
                      <Heart className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>

                  <div className="px-4 py-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {productName}
                        </h3>
                        {productPrice && (
                          <p className="text-sm font-medium text-green-600">
                            {productPrice}
                          </p>
                        )}
                        <p className="text-sm text-gray-500 truncate">
                          {retailerName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {session.category || 'Algemeen'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center text-sm text-gray-500">
                      <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                      <span>{new Date(session.created_at).toLocaleDateString('nl-NL')}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex space-x-2">
                      {session.status === 'COMPLETED' && session.generated_image_url && (
                        <button className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                          <Eye className="h-4 w-4 mr-1" />
                          Bekijken
                        </button>
                      )}
                      
                      {firstProduct?.product_url && (
                        <button 
                          onClick={() => window.open(firstProduct.product_url, '_blank')}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Product
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default CustomerSessions;
