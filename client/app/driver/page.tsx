"use client";

import React, { useState, useEffect } from 'react';
import DriverForm from "@/components/driver/DriverForm";
import OrderListWithPagination from "@/components/driver/OrderListWithPagination";
import DriverOrdersPage from "@/components/driver/DriverOrdersPage";
import DriverAvailableTimes from "@/components/driver/DriverAvailableTimes"; 
import { NavigationBar } from "@/components/NavigationBar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { useRouter } from 'next/navigation';
import UserService from '@/services/user/user'; 
import DriverService  from '@/services/driver/driver';
import { Driver } from '@/interfaces/driver/driver'; 
import { Order } from '@/interfaces/tribe_resident/buyer/order';
import { DriverOrder } from '@/interfaces/driver/driver';


const DriverPage: React.FC = () => {
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [showDriverOrders, setShowDriverOrders] = useState(false);
    const [unacceptedOrders, setUnacceptedOrders] = useState<Order[]>([]);
    const [acceptedOrders, setAcceptedOrders] = useState<Order[]>([]);
    const [driverData, setDriverData] = useState<Driver | null>(null);
    const router = useRouter();
    const [user, setUser] = useState(UserService.getLocalStorageUser());
    const [isClient, setIsClient] = useState(false); 
    const [showAddTimeTip, setShowAddTimeTip] = useState(true);

    // add state for showing unaccepted orders
    const [showUnacceptedOrders, setShowUnacceptedOrders] = useState(false);



    useEffect(() => {
        setShowAddTimeTip(true);
        setIsClient(true);
        const handleUserDataChanged = () => {
            const updatedUser = UserService.getLocalStorageUser();
            setUser(updatedUser);
        };
    
        window.addEventListener("userDataChanged", handleUserDataChanged);
    
        return () => {
            window.removeEventListener("userDataChanged", handleUserDataChanged);
        };
    }, []);

    // ensure user.is_driver is a boolean
    useEffect(() => {
        if (user && typeof user.is_driver === 'string') {
            user.is_driver = user.is_driver === 'true';
            setUser({ ...user });
        }
    }, [user]);

    // use user.id to get driverData
    useEffect(() => {

    /**
     * Fetch driver data based on user_id.
     * @param userId - The user's ID.
     */
    const fetchDriverData = async (userId: number) => {
        try {
            const response = await fetch(`/api/drivers/user/${userId}`);
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn("使用者尚未成為司機");
                } else {
                    throw new Error(`Failed to fetch driver data: ${response.statusText}`);
                }
            } else {
                const data: Driver = await response.json();
                setDriverData(data);
                handleFetchDriverOrders(data.id);
            }
        } catch (error) {
            console.error('Error fetching driver data:', error);
        }
    };

        if (isClient && user && user.is_driver) {
            fetchDriverData(user.id);
        }
    }, [isClient, user]);



    /**
     * Fetch unaccepted orders.
     */
    const handleFetchUnacceptedOrders = async () => {
        try {
            const response = await fetch(`/api/orders`);
            if (!response.ok) {
                throw new Error('Failed to fetch unaccepted orders');
            }
            
            let data: Order[] = await response.json();
            data = data.filter((order) => 
                order.order_status === "未接單")
                .sort((a, b) => (b.is_urgent ? 1 : 0) - (a.is_urgent ? 1 : 0));
                
            setUnacceptedOrders(data);
        } catch (error) {
            console.error('Error fetching unaccepted orders:', error);
        }
    };

    /**
     * Fetch accepted orders assigned to the driver.
     * @param driverId - The driver's ID.
     */
    const handleFetchDriverOrders = async (driverId: number) => {
        try {
            const response = await fetch(`/api/drivers/${driverId}/orders`);
            if (!response.ok) {
                throw new Error('Failed to fetch driver orders');
            }
            const data = await response.json();
            setAcceptedOrders(data);
        } catch (error) {
            console.error('Error fetching driver orders:', error);
        }
    };



    //New Version to handle accepting an order
    
    const handleAcceptOrder = async (orderId: string, service: string) => {
        // First confirmation
        const confirmFirst = window.confirm("您確定要接單嗎？");
        if (!confirmFirst) return;

        // Second confirmation
        const confirmSecond = window.confirm("請再次確認：確定接單？");
        if (!confirmSecond) return;
        
        if (!driverData || !driverData.id) {
            console.error("Driver data is missing or incomplete");
            return;
        }
        try {
            const timestamp = new Date().toISOString();
            const acceptOrder: DriverOrder = {
                driver_id: driverData.id,
                order_id: parseInt(orderId),  
                action: "接單",
                timestamp: timestamp,
                previous_driver_id: undefined,
                previous_driver_name: undefined,
                previous_driver_phone: undefined,
                service: service
            }
            await DriverService.handle_accept_order(service, parseInt(orderId), acceptOrder)
            alert('接單成功');

            handleFetchUnacceptedOrders(); 
        } catch (error) {
            console.error('Error accepting order:', error);
            alert('接單失敗');
        }
    };

    /**
     * Handle transferring an order.
     * @param orderId - The ID of the order to transfer.
     * @param newDriverPhone - The phone number of the new driver.
     */
    const handleTransferOrder = async (orderId: string, newDriverPhone: string) => {      
        try {
            const response = await fetch(`/api/orders/${orderId}/transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ current_driver_id: driverData?.id, new_driver_phone: newDriverPhone }),
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to transfer order: ${errorText}`);
            }
    
            alert('轉單成功，已成功交給目標司機');
            await handleFetchUnacceptedOrders();

        } catch (error) {


            console.error('Error transferring order:', error);
            alert('轉單失敗，請重新整理頁面讓表單重新出現');
        }
    };

    /**
     * Handle navigating to order details.
     * @param orderId - The ID of the order to navigate to.
     * @param driverId - The driver's ID.
     */
    const handleNavigate = (orderId: string, driverId: number) => {
        router.push(`/navigation?orderId=${orderId}&driverId=${driverId}`);
    };

    /**
     * Handle completing an order.
     * @param orderId - The ID of the order to complete.
     */
    const handleCompleteOrder = async (orderId: string, service: string) => {     
        try {
            const response = await fetch(`/api/orders/${service}/${orderId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to complete order');
            }

            alert('訂單已完成');

        } catch (error) {
            console.error('Error completing order:', error);
            alert('完成訂單失敗');
        }
    };

    /**
     * Handle applying to become a driver.
     */
    const handleApplyDriverClick = () => {
        if (!user || user.id === 0 || user.name === 'empty' || user.phone === 'empty') {
            alert('請先按右上角的登入');
        } else {
            setShowRegisterForm(true);
        }
    };

    /**
     * Handle successful driver data update.
     * @param data - Updated driver data.
     */
    const handleUpdateSuccess = (data: Driver): void => {
        setDriverData(data);

        // Update user to driver
        const updatedUser = { ...user, is_driver: true };
        UserService.setLocalStorageUser(updatedUser);
        setUser(updatedUser);
        setShowRegisterForm(false);
    };


    /**
     * Toggle the visibility of Unaccepted Orders List
     */
    const toggleUnacceptedOrders = () => {
        setShowUnacceptedOrders(prev => {
            const newState = !prev;
            if (newState && unacceptedOrders.length === 0) {
                handleFetchUnacceptedOrders();
            }
            return newState;
        });
    };

    return (
        <div>
            <NavigationBar />
            <div
                className="flex h-screen"
                style={{
                    backgroundImage: 'url("/road.jpg")',
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    opacity: 1,
                    width: '100vw',
                    height: '100vh', 
                }}
            >
                <div className="content flex-grow p-10 bg-white bg-opacity-10 flex flex-col items-center">
                    
                    {/* To remind */}
                    {showAddTimeTip && (
                        <div className="bg-blue-100 border border-blue-500 text-blue-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <strong className="font-bold">提醒：</strong>
                            <span className="block sm:inline">1.如果有接單，請記得到新增時間去填寫可運送時間</span>
                            <span className="block sm:inline">2.接單時請自行評估要運送多少商品(以車子是否放得下為主要考量)</span>
                            <Button
                                className="absolute top-0 bottom-0 right-0 px-4 py-3" 
                                onClick={() => setShowAddTimeTip(false)}
                            >
                                <span aria-hidden="true">&times;</span>
                            </Button>
                        </div>
                    )}
                    
                    <div className="w-full flex justify-start space-x-2 mt-4">
                    </div>
                    <h1 className="mb-20 text-4xl font-bold text-white text-center" style={{ marginTop: '40px' }}>司機專區</h1>
                    <div className="flex flex-wrap space-x-4 justify-center">
                        {/* If user is not a driver */}
                        {(isClient && !user?.is_driver)  && (
                            <Button 
                                className="mb-10 px-6 py-3 text-lg font-bold border-2 border-black text-black bg-white hover:bg-blue-500 hover:text-white"
                                onClick={handleApplyDriverClick}
                            >
                                申請司機
                            </Button>
                        )}

                        {isClient && user?.is_driver && (
                            <div className="flex flex-col items-center">
                                <DriverAvailableTimes driverId={driverData?.id || 0} />
                             
                                <Button 
                                    className="mb-10 px-6 py-3 text-lg font-bold border-2 border-black text-black bg-white hover:bg-blue-500 hover:text-white"
                                    onClick={() => {
                                        setShowDriverOrders(true);
                                        if (driverData?.id) {
                                            handleFetchDriverOrders(driverData.id);
                                        }
                                    }}
                                >
                                    管理訂單和導航
                                </Button>

                                

                                <Button 
                                    className="mb-10 px-6 py-3 text-lg font-bold border-2 border-black text-black bg-white hover:bg-blue-500 hover:text-white"
                                    onClick={toggleUnacceptedOrders}
                                >
                                    {showUnacceptedOrders ? '隱藏未接單表單' : '取得未接單表單'}
                                </Button>



       
                            </div>
                        )}
                    </div>


                    {/* Apply for driver */}
                    <Sheet open={showRegisterForm} onOpenChange={setShowRegisterForm}>
                        <SheetContent 
                            side="right"
                            className="w-full sm:max-w-2xl p-0 sm:p-6"
                        >
                            <SheetHeader className="p-6 sm:p-0">
                                <SheetTitle>申請司機</SheetTitle>
                                <SheetClose />
                            </SheetHeader>
                            <div className="overflow-y-auto h-[calc(100vh-80px)] p-6 sm:p-0">
                                <DriverForm onClose={() => setShowRegisterForm(false)} onUpdateSuccess={handleUpdateSuccess} />
                            </div>
                        </SheetContent>
                    </Sheet>

                    <Sheet open={showDriverOrders} onOpenChange={setShowDriverOrders}>
                        <SheetContent 
                            side="right"
                            className="w-full sm:max-w-2xl p-0 sm:p-6"
                        >
                            <SheetHeader className="p-6 sm:p-0">
                                <SheetTitle>我的訂單</SheetTitle>
                                <SheetClose />
                            </SheetHeader>
                            <div className="overflow-y-auto h-[calc(100vh-80px)] p-6 sm:p-0">
                                {driverData && 
                                    <DriverOrdersPage 
                                        driverData={driverData} 
                                        onAccept={handleAcceptOrder}
                                        onTransfer={handleTransferOrder}
                                        onNavigate={(orderId: string) => handleNavigate(orderId, driverData?.id || 0)}
                                        onComplete={handleCompleteOrder}
                                    />
                                }
                            </div>
                        </SheetContent>
                    </Sheet>

                    {/* OrderList */}
                    <div className="w-full mt-10">
                        {/* UnacceptedOrdersList */}
                        {showUnacceptedOrders && (
                            <div className="mb-10">
                                <OrderListWithPagination
                                    orders={unacceptedOrders}
                                    onAccept={handleAcceptOrder}
                                    onTransfer={handleTransferOrder}
                                    onNavigate={(orderId: string) => handleNavigate(orderId, driverData?.id || 0)}
                                    onComplete={handleCompleteOrder}
                                    driverId={driverData?.id || 0}
                                />
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );

};

export default DriverPage;
