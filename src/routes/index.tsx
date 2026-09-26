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
                element: <PlaceholderModule title="Enterprise Operations Dashboard" moduleName="Dashboard" category="Main" />,
              },
              /* Products */
              {
                path: 'products',
                element: <PlaceholderModule title="StockSense Product Catalog" moduleName="Products" category="Inventory" createPath="/products/new" />,
              },
              {
                path: 'products/new',
                element: <PlaceholderModule title="Create New Product" moduleName="New Product" category="Inventory" />,
              },
              {
                path: 'products/:id',
                element: <PlaceholderModule title="Product Details: DESK001" moduleName="Product Details" category="Inventory" />,
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
              /* Settings */
              {
                path: 'settings/warehouses',
                element: <PlaceholderModule title="Warehouse Facilities" moduleName="Warehouses" category="Configuration" />,
              },
              {
                path: 'settings/locations',
                element: <PlaceholderModule title="Locations & Bins Hierarchy" moduleName="Locations" category="Configuration" />,
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
