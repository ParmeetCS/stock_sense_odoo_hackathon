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
import { StockList } from '../pages/stock/StockList';
import { ReceiptList } from '../pages/operations/receipts/ReceiptList';
import { ReceiptCreate } from '../pages/operations/receipts/ReceiptCreate';
import { ReceiptDetail } from '../pages/operations/receipts/ReceiptDetail';
import { TransferList } from '../pages/operations/transfers/TransferList';
import { TransferCreate } from '../pages/operations/transfers/TransferCreate';
import { TransferDetail } from '../pages/operations/transfers/TransferDetail';
import { AdjustmentList } from '../pages/operations/adjustments/AdjustmentList';
import { AdjustmentCreate } from '../pages/operations/adjustments/AdjustmentCreate';
import { AdjustmentDetail } from '../pages/operations/adjustments/AdjustmentDetail';
import { MoveHistoryList } from '../pages/audit/MoveHistoryList';
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
                element: <StockList />,
              },
              /* Receipts */
              {
                path: 'operations/receipts',
                element: <ReceiptList />,
              },
              {
                path: 'operations/receipts/new',
                element: <ReceiptCreate />,
              },
              {
                path: 'operations/receipts/:id',
                element: <ReceiptDetail />,
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
                element: <TransferList />,
              },
              {
                path: 'operations/transfers/new',
                element: <TransferCreate />,
              },
              {
                path: 'operations/transfers/:id',
                element: <TransferDetail />,
              },
              /* Adjustments */
              {
                path: 'operations/adjustments',
                element: <AdjustmentList />,
              },
              {
                path: 'operations/adjustments/new',
                element: <AdjustmentCreate />,
              },
              {
                path: 'operations/adjustments/:id',
                element: <AdjustmentDetail />,
              },
              /* Move History */
              {
                path: 'move-history',
                element: <MoveHistoryList />,
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
