"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const clean_text = (text: string | null): string => {
    if (!text) {
        return '';
    }
    return text.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
};

interface Mistake {
    id: number;
    mock_id: number;
    image_path: string;
    section_name: string;
    question_type: string;
    question_text: string;
    options: { [key: string]: string };
    user_answer: string | null;
    correct_answer: string | null;
    tier: string;
}

const PracticePage = () => {
    const [mistakes, setMistakes] = useState<Mistake[]>([]);
    const [sections, setSections] = useState<string[]>([]);
    const [selectedSection, setSelectedSection] = useState<string>('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const res = await fetch('/api/practice/sections');
                const data = await res.json();
                setSections(data.sections || []);
                if (data.sections && data.sections.length > 0) {
                    setSelectedSection(data.sections[0]);
                }
            } catch (error) {
                console.error('Failed to fetch sections:', error);
            }
        };
        fetchSections();
    }, []);

    useEffect(() => {
        if (selectedSection) {
            const fetchMistakes = async () => {
                setLoading(true);
                try {
                    const res = await fetch(`/api/practice/quiz?section=${selectedSection}`);
                    const data = await res.json();
                    setMistakes(data || []);
                    setCurrentIndex(0);
                } catch (error) {
                    console.error('Failed to fetch mistakes:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchMistakes();
        }
    }, [selectedSection]);

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % mistakes.length);
    };

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev - 1 + mistakes.length) % mistakes.length);
    };

    return (
        <div className="container mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Practice Mode</h1>
                {sections.length > 0 && (
                     <Select onValueChange={setSelectedSection} defaultValue={selectedSection}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select a section" />
                        </SelectTrigger>
                        <SelectContent>
                            {sections.map(section => (
                                <SelectItem key={section} value={section}>{section}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {loading ? (
                <p>Loading questions...</p>
            ) : mistakes.length > 0 ? (
                <>
                    <PracticeView mistake={mistakes[currentIndex]} />
                    <div className="flex justify-between mt-4">
                        <Button onClick={handlePrevious}><ChevronLeft className="mr-2 h-4 w-4" /> Previous</Button>
                        <span className="self-center">{currentIndex + 1} / {mistakes.length}</span>
                        <Button onClick={handleNext}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
                    </div>
                </>
            ) : (
                <p>No mistakes found for this section. Well done!</p>
            )}
        </div>
    );
};

const PracticeView = ({ mistake }: { mistake: Mistake }) => {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);

    useEffect(() => {
        setSelectedOption(null);
        setIsAnswered(false);
    }, [mistake]);

    const handleCheckAnswer = () => {
        if (selectedOption) {
            setIsAnswered(true);
        }
    };

    const getOptionLabel = (fullAnswer: string | null) => {
        if (!fullAnswer) return '';
        return fullAnswer.split('.')[0] || '';
    };

    const correctOptionLabel = getOptionLabel(mistake.correct_answer);

    const getOptionStyle = (key: string) => {
        if (!isAnswered) return '';
        if (key === correctOptionLabel) {
            return 'border-green-500 bg-green-100 dark:bg-green-900';
        }
        if (key === selectedOption && key !== correctOptionLabel) {
            return 'border-red-500 bg-red-100 dark:bg-red-900';
        }
        return '';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Question from {mistake.section_name} ({mistake.tier})</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="interactive">
                    <TabsList>
                        <TabsTrigger value="interactive">Interactive</TabsTrigger>
                        <TabsTrigger value="screenshot">Original Screenshot</TabsTrigger>
                    </TabsList>
                    <TabsContent value="interactive" className="mt-4">
                        <div className="mb-6">
                            <p className="whitespace-pre-wrap">{clean_text(mistake.question_text)}</p>
                        </div>
                        
                        <RadioGroup onValueChange={setSelectedOption} value={selectedOption || ''} disabled={isAnswered}>
                            {mistake.options && Object.entries(mistake.options)
                                // 👇 THIS IS THE CHANGE: Only include options with keys A, B, C, or D
                                .filter(([key]) => ['A', 'B', 'C', 'D'].includes(key))
                                .map(([key, value]) => {
                                const optionStyle = getOptionStyle(key);
                                
                                return (
                                    <div key={key} className={`flex items-center space-x-2 p-3 border rounded-md mb-2 ${optionStyle}`}>
                                        <RadioGroupItem value={key} id={key} />
                                        <Label htmlFor={key} className="flex-1">{`${key}. ${clean_text(value)}`}</Label>
                                    </div>
                                );
                            })}
                        </RadioGroup>
                    </TabsContent>
                    <TabsContent value="screenshot" className="mt-4">
                        <img 
                            src={`/api/mistakes/image/${mistake.image_path}`} 
                            alt={`Screenshot for mistake ${mistake.id}`} 
                            className="max-w-full h-auto rounded-lg border"
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4">
                {!isAnswered ? (
                    <Button onClick={handleCheckAnswer} disabled={!selectedOption}>Check Answer</Button>
                ) : (
                    <>
                        {selectedOption === correctOptionLabel ? (
                            <Alert>
                                <Lightbulb className="h-4 w-4" />
                                <AlertTitle>Correct!</AlertTitle>
                                <AlertDescription>
                                    Well done! You selected the correct answer.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert variant="destructive">
                                <Lightbulb className="h-4 w-4" />
                                <AlertTitle>Not quite!</AlertTitle>
                                <AlertDescription>
                                    <div>The correct answer is: <strong>{clean_text(mistake.correct_answer)}</strong></div>
                                    {mistake.user_answer && <div>Your original answer was: <strong>{clean_text(mistake.user_answer)}</strong></div>}
                                </AlertDescription>
                            </Alert>
                        )}
                    </>
                )}
            </CardFooter>
        </Card>
    );
};

export default PracticePage;