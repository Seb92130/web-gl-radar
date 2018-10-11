// UdpRadarServer.cpp : Defines the entry point for the console application.
//

#include "stdafx.h"
#include <stdint.h>

#include <iostream>
#include <winsock2.h>
#include "Ws2tcpip.h"
#include <random>
#include <vector>
#include <cmath>

#pragma comment(lib,"ws2_32.lib") //Winsock Library

#define PORT 8888   //The port on which to listen for incoming data

#pragma pack(push, 1)
struct RadarData {
	char inputType[5];
	uint32_t angle;
	uint32_t radius;
};
#pragma pack(pop)

#pragma pack(push, 1)
struct TargetData {
	char inputType[5];
	int32_t targetX;
	int32_t targetY;
	uint32_t angle;
	uint32_t index;
};
#pragma pack(pop)

int main()
{
	WSADATA wsaData;
	WSAStartup(MAKEWORD(2, 2), &wsaData);

	SOCKET sock = socket(AF_INET, SOCK_DGRAM, 0);
	if (sock == INVALID_SOCKET)
	{
		perror("socket creation");
		return 1;
	}

	BOOL enabled = TRUE;
	if (setsockopt(sock, SOL_SOCKET, SO_BROADCAST, (char*)&enabled, sizeof(BOOL)) < 0)
	{
		perror("broadcast options");
		closesocket(sock);
		return 1;
	}

	struct sockaddr_in Sender_addr;
	Sender_addr.sin_family = AF_INET;
	Sender_addr.sin_port = htons(PORT);
	InetPton(AF_INET, _T("127.0.0.255"), &Sender_addr.sin_addr.s_addr);

	RadarData radarData{ "INP1",0,0 };

	std::default_random_engine generator;
	std::uniform_real_distribution<double> unif(0, 20);
	std::uniform_real_distribution<double> unifTargetList(0, 350);
	std::uniform_real_distribution<double> unifTargetAngle(0, 360);
	std::uniform_real_distribution<double> unifRand(0, 100);
	std::uniform_real_distribution<double> unifTargetDelta(0, 2);

	std::vector<TargetData> targetList;
	for (uint32_t i = 0; i < 25; ++i) {
		uint32_t randRadius = static_cast<uint32_t>(unifTargetList(generator));
		uint32_t angle = static_cast<uint32_t>(unifTargetAngle(generator));
		int32_t targetX = static_cast<int32_t>(randRadius * cos(angle * (3.14159265358979323846 / 180)));
		int32_t targetY = static_cast<int32_t>(randRadius * sin(angle * (3.14159265358979323846 / 180)));

		targetList.push_back({
			"INP2" // type
			, targetX
			, targetY
			, angle
			, i
		});

	}

	while (1)
	{
		Sleep(25);

		radarData.radius = 380 + static_cast<uint32_t>(unif(generator));

		char buffer[sizeof(RadarData)];
		memcpy(buffer, &radarData, sizeof(RadarData));

		if (sendto(sock, buffer, sizeof(RadarData), 0, (sockaddr *)&Sender_addr, sizeof(Sender_addr)) < 0)
		{
			closesocket(sock);
			return 0;
		}

		for (auto& target : targetList) {
			if (target.angle == radarData.angle) {
				char buffer[sizeof(TargetData)];
				memcpy(buffer, &target, sizeof(TargetData));

				if (sendto(sock, buffer, sizeof(TargetData), 0, (sockaddr *)&Sender_addr, sizeof(Sender_addr)) < 0)
				{
					closesocket(sock);
					return 0;
				}

				target.targetX += static_cast<int32_t>((static_cast<int32_t>(unifRand(generator)) % 2 == 0 ? -1.0 : 1.0) * static_cast<int32_t>(unifTargetDelta(generator)));
				target.targetY += static_cast<int32_t>((static_cast<int32_t>(unifRand(generator)) % 2 == 0 ? -1.0 : 1.0) * static_cast<int32_t>(unifTargetDelta(generator)));
				target.angle = ( static_cast<uint32_t>(atan2(target.targetY, target.targetX) * 180 / 3.14159265358979323846) + 360 ) % 360;
			}
		}

		++radarData.angle;
		if (radarData.angle > 360) radarData.angle = 0;


		//std::cout << "radar Data{" << radarData.angle << "," << radarData.radius << "}" << std::endl;
	}

	closesocket(sock);
	WSACleanup();

	return 0;
}

