import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { RootLayout } from '../layouts/RootLayout';
import { AppShell } from '../layouts/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { OtpVerification } from '../pages/auth/OtpVerification';
import { ResetPassword } from '../pages/auth/ResetPassword';
import { ProfilePage } from '../pages/ProfilePage';
import { Dashboard } from '../pages/Dashboard';
import { ProductList } from '../pages/products/ProductList';
import { ProductCreate } from '../pages/products/ProductCreate';
import { ProductDetail } from '../pages/products/ProductDetail';
import { WarehouseList } from '../pages/warehouses/WarehouseList';
import { WarehouseCreate } from '../pages/warehouses/WarehouseCreate';
import { WarehouseDetail } from '../pages/warehouses/WarehouseDetail';
import { LocationList } from '../pages/locations/LocationList';
import { LocationCreate } from '../pages/locations/LocationCreate';
import { LocationDetail } from '../pages/locations/LocationDetail';
import { PlaceholderModule } from '../components/PlaceholderModule';

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      /* Public Auth Routes */
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'verify-otp', element: <OtpVerification /> },
      { path: 'reset-password', element: <ResetPassword /> },

      /* Protected Application Shell Routes */
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              {
                path: 'dashboard',
                element: <Dashboard />,
              },
              /* Products */
              {
                path: 'products',
                element: <ProductList />,
              },
              {
                path: 'products/new',
                element: <ProductCreate />,
              },
              {
                path: 'products/:id',
                element: <ProductDetail />,
              },
              /* Stock */
              {
                path: 'stock',
                element: <PlaceholderModule title="Live Stock on Hand & Ledger" moduleName="Stock Levels" category="Inventory" />,
              },
              /* Receipts */
              {
                path: 'operations/receipts',
                element: <PlaceholderModule title="Inbound Receipts Kanban & List" moduleName="Receipts" category="Operations" createPath="/operations/receipts/new" />,
              },
              {
                path: 'operations/receipts/new',
                element: <PlaceholderModule title="Create Inbound Receipt" moduleName="New Receipt" category="Operations" />,
              },
              {
                path: 'operations/receipts/:id',
                element: <PlaceholderModule title="Receipt Detail: WH/IN/0001" moduleName="Receipt Detail" category="Operations" />,
              },
              /* Deliveries */
              {
                path: 'operations/deliveries',
                element: <PlaceholderModule title="Outbound Deliveries List" moduleName="Deliveries" category="Operations" createPath="/operations/deliveries/new" />,
              },
              {
                path: 'operations/deliveries/new',
                element: <PlaceholderModule title="Create Outbound Delivery" moduleName="New Delivery" category="Operations" />,
              },
              {
                path: 'operations/deliveries/:id',
                element: <PlaceholderModule title="Delivery Detail: WH/OUT/0001" moduleName="Delivery Detail" category="Operations" />,
              },
              /* Transfers */
              {
                path: 'operations/transfers',
                element: <PlaceholderModule title="Internal Transfers List" moduleName="Internal Transfers" category="Operations" createPath="/operations/transfers/new" />,
              },
              {
                path: 'operations/transfers/new',
                element: <PlaceholderModule title="Create Internal Transfer" moduleName="New Transfer" category="Operations" />,
              },
              {
                path: 'operations/transfers/:id',
                element: <PlaceholderModule title="Transfer Detail: WH/INT/0001" moduleName="Transfer Detail" category="Operations" />,
              },
              /* Adjustments */
              {
                path: 'operations/adjustments',
                element: <PlaceholderModule title="Inventory Adjustments List" moduleName="Adjustments" category="Operations" createPath="/operations/adjustments/new" />,
              },
              {
                path: 'operations/adjustments/new',
                element: <PlaceholderModule title="Create Inventory Adjustment" moduleName="New Adjustment" category="Operations" />,
              },
              {
                path: 'operations/adjustments/:id',
                element: <PlaceholderModule title="Adjustment Detail: ADJ/0001" moduleName="Adjustment Detail" category="Operations" />,
              },
              /* Move History */
              {
                path: 'move-history',
                element: <PlaceholderModule title="Move History & Audit Trail" moduleName="Move History" category="Audit" />,
              },
              /* Settings - Warehouses */
              {
                path: 'settings/warehouses',
                element: <WarehouseList />,
              },
              {
                path: 'settings/warehouses/new',
                element: <WarehouseCreate />,
              },
              {
                path: 'settings/warehouses/:id',
                element: <WarehouseDetail />,
              },
              /* Settings - Locations */
              {
                path: 'settings/locations',
                element: <LocationList />,
              },
              {
                path: 'settings/locations/new',
                element: <LocationCreate />,
              },
              {
                path: 'settings/locations/:id',
                element: <LocationDetail />,
              },
              /* Profile */
              {
                path: 'profile',
                element: <ProfilePage />,
              },
            ],
          },
        ],
      },
    ],
  },
]);

export const AppRoutes = () => {
  return <RouterProvider router={router} />;
};
